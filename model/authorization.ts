import {NotFoundError} from "../utils/errors";
import {ensureNewHolders} from "./persons";

export async function createAuthorization(args, unitId, prisma) {
	await ensureNewHolders(args.holders, prisma);
	return await prisma.$transaction(async (tx) => {
		const date = args.creation_date ?? (new Date()).toLocaleDateString("en-GB");
		const [dayCrea, monthCrea, yearCrea] = date.split("/").map(Number);
		const [day, month, year] = args.expiration_date.split("/").map(Number);
		const authorization = await tx.authorization.create({
			data: {
				authorization: args.authorization,
				status: args.status,
				creation_date: new Date(yearCrea, monthCrea - 1, dayCrea, 12),
				expiration_date: new Date(year, month - 1, day, 12),
				id_unit: unitId,
				renewals: 0,
				type: args.type,
				authority: args.authority
			}
		});

		await checkRelations(tx, args, authorization);
	});
}

export async function updateAuthorization(args, auth, prisma, tx = undefined) {
	if (tx) {
		await doUpdateAuthorization(tx);
	} else {
		await prisma.$transaction(async (tx) => doUpdateAuthorization(tx));
	}

	async function doUpdateAuthorization (tx) {
		const [day, month, year] = args.expiration_date.split("/").map(Number);
		const newExpDate = new Date(year, month - 1, day, 12);
		const ren = args.renewals ?? (newExpDate > auth.expiration_date ? (auth.renewals + 1) : auth.renewals);
		const data = {
			status: args.status,
			expiration_date: newExpDate,
			authority: args.authority ?? auth.authority,
			renewals: ren
		}
		if (args.id_unit) {
			data['id_unit'] = args.id_unit;
		}

		const updatedAuthorization = await tx.authorization.update(
			{ where: { id_authorization: auth.id_authorization },
				data: data
			});

		await checkRelations(tx, args, updatedAuthorization);
	}
}

export async function getAuthorizationsWithPagination(args, prisma) {
	const queryArray = args.search.split("&");
	const dictionary = queryArray.map(query => query.split("="));
	const whereCondition = [];
	whereCondition.push({ type: args.type})
	if (dictionary.length > 0) {
		dictionary.forEach(query => {
			const value = decodeURIComponent(query[1]);
			if (query[0] === 'Unit') {
				whereCondition.push({ unit: { is: {name: {contains: value}} }})
			} else if (query[0] === 'Authorization') {
				whereCondition.push({ authorization: { contains: value }})
			} else if (query[0] === 'Status') {
				whereCondition.push({ status: { contains: value }})
			} else if (query[0] === 'Room') {
				whereCondition.push({ authorization_has_room: { some: {room: {is: {name: {contains: value}}}} }})
			} else if (query[0] === 'Holder') {
				whereCondition.push({
					authorization_has_holder: {
						some: {
							holder: {
								OR: [
									{ name: { contains: value } },
									{ surname: { contains: value } },
									{ email: { contains: value } },
									{ sciper: parseInt(value) },
								],
							},
						},
					}
				})
			} else if (query[0] === 'CAS') {
				whereCondition.push({ authorization_has_chemical: { some: {chemical: {
								OR: [
									{ cas_auth_chem: { contains: value } },
									{ auth_chem_en: { contains: value } }
								],
							}} }})
			} else if (query[0] === 'Source') {
				whereCondition.push({ authorization_has_radiation: { some: {source: {contains: value}} }})
			}
		})
	}

	const authorizationList = await prisma.authorization.findMany({
		where: {
			AND: whereCondition
		},
		include: { authorization_has_chemical: { include: { chemical: true } } },
		orderBy: [
			{
				authorization: 'asc',
			},
		]
	});

	const authorizations = args.take == 0 ? authorizationList : authorizationList.slice(args.skip, args.skip + args.take);
	const totalCount = authorizationList.length;

	return { authorizations, totalCount };
}

export async function getTheAuthorization(args, prisma) {
	const whereCondition = [];
	whereCondition.push({ type: args.type})
	whereCondition.push({ authorization: args.search })

	const authorizationList = await prisma.authorization.findMany({
		where: {
			AND: whereCondition
		},
		orderBy: [
			{
				authorization: 'asc',
			},
		]
	});
	if (authorizationList.length === 0) {
		throw new Error(`No authorization found: ${JSON.stringify(args)}`);
	} else if (authorizationList.length > 1) {
		throw new Error(`More than one authorization found: ${authorizationList.map(auth => auth.authorization).join(', ')} for these args: ${JSON.stringify(args)}`);
	} else {
		return authorizationList[0];
	}
}

async function checkRelations(tx, args, authorization) {
	for ( const holder of args.holders || []) {
		if ( holder.status === 'New' ) {
			let p = await tx.Person.findUnique({where: {sciper: holder.sciper}});

			const relation = {
				id_person: Number(p.id_person),
				id_authorization: Number(authorization.id_authorization)
			};
			await tx.authorization_has_holder.create({
				data: relation
			});
		} else if ( holder.status === 'Deleted' ) {
			let p = await tx.Person.findUnique({where: {sciper: holder.sciper}});
			if ( p ) {
				const whereCondition = {
					id_authorization: authorization.id_authorization,
					id_person: p.id_person
				};
				await tx.authorization_has_holder.deleteMany({
					where: whereCondition
				});
			}
		}
	}

	for ( const room of args.rooms || []) {
		if ( room.status === 'New' ) {
			let r = undefined;
			if ( room.name ) {
				r = await tx.Room.findFirst({where: {name: room.name, isDeleted: false}})
			} else if ( room.id ) {
				r = await tx.Room.findUnique({where: {id: room.id, isDeleted: false}})
			}
			if ( !r ) throw new Error(`Authorization not created: room not found`);
			const relation = {
				id_lab: Number(r.id),
				id_authorization: Number(authorization.id_authorization)
			};
			await tx.authorization_has_room.create({
				data: relation
			});
		} else if ( room.status === 'Deleted' ) {
			let p = await tx.Room.findFirst({where: {name: room.name}});
			if ( p ) {
				const whereCondition = {
					id_authorization: authorization.id_authorization,
					id_lab: p.id
				};
				await tx.authorization_has_room.deleteMany({
					where: whereCondition
				});
			}
		}
	}

	for ( const source of args.radiations || []) {
		if ( source.status === 'New' ) {
			const relation = {
				id_authorization: Number(authorization.id_authorization),
				source: source.name
			};
			await tx.authorization_has_radiation.create({
				data: relation
			});
		} else if ( source.status === 'Deleted' ) {
			const whereCondition = {
				id_authorization: authorization.id_authorization,
				source: source.name
			};
			await tx.authorization_has_radiation.deleteMany({
				where: whereCondition
			});
		}
	}

	for ( const cas of args.cas || []) {
		if ( cas.status === 'New' ) {
			let p = await tx.auth_chem.findUnique({where: {cas_auth_chem: cas.name}});

			if ( !p ) {
				throw new NotFoundError(`CAS ${cas.name} not found`);
			}

			const relation = {
				id_chemical: Number(p.id_auth_chem),
				id_authorization: Number(authorization.id_authorization)
			};
			await tx.authorization_has_chemical.create({
				data: relation
			});
		} else if ( cas.status === 'Deleted' ) {
			let p = await tx.auth_chem.findUnique({where: {cas_auth_chem: cas.name}});
			if (p) {
				const whereCondition = {
					id_authorization: authorization.id_authorization,
					id_chemical: p.id_auth_chem
				};
				await tx.authorization_has_chemical.deleteMany({
					where: whereCondition
				});
			}
		}
	}
}
