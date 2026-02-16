import {NotFoundError} from "../utils/errors";
import {ensurePerson} from "./persons";
import {AuthorizationChanges} from "../utils/changeTypes";

export async function createAuthorization(prisma, auth, unitId, newHolders) {
	await ensurePerson(prisma, newHolders);
	return await prisma.$transaction(async (tx) => {
		const authorization = await tx.authorization.create({
			data: {
				authorization: auth.authorization,
				status: auth.status,
				creation_date: auth.creation_date,
				expiration_date: auth.expiration_date,
				id_unit: unitId,
				renewals: 0,
				type: auth.type,
				authority: auth.authority
			}
		});

		await setAuthorizationRelations(tx, Number(authorization.id_authorization), auth);
	});
}

export async function updateAuthorization(prisma, newData, oldAuth, tx = undefined) {
	if (tx) {
		await doUpdateAuthorization(tx);
	} else {
		await prisma.$transaction(async (tx) => doUpdateAuthorization(tx));
	}

	async function doUpdateAuthorization (tx) {
		const ren = newData.renewals ?? (newData.expiration_date > oldAuth.expiration_date ? (oldAuth.renewals + 1) : oldAuth.renewals);
		const data = {
			status: newData.status,
			expiration_date: newData.expiration_date,
			authority: newData.authority ?? oldAuth.authority,
			renewals: ren,
			date_expiry_notified: oldAuth.date_expiry_notified && ren > oldAuth.renewals ? null : oldAuth.date_expiry_notified
		}
		if (newData.id_unit) {
			data['id_unit'] = newData.id_unit;
		}

		const updatedAuthorization = await tx.authorization.update(
			{ where: { id_authorization: oldAuth.id_authorization },
				data: data
			});

		await setAuthorizationRelations(tx, Number(updatedAuthorization.id_authorization), newData);
	}
}

export async function getAuthorizations(prisma, type: string, conditions?: Partial<{
	unit: string,
	authorization: string,
	status: string,
	room: string,
	holder: string,
	cas: string,
	source: string
}>, take = 0, skip = 0) {
	const { unit, authorization, status, room, holder, cas, source } = conditions || {};
	const whereCondition = [];
	whereCondition.push({ type: type});
	if (unit) {
		whereCondition.push({ unit: { is: {name: {contains: unit}} }})
	}
	if (authorization) {
		whereCondition.push({ authorization: { contains: authorization }})
	}
	if (status) {
		whereCondition.push({ status: status })
	}
	if (room) {
		whereCondition.push({ authorization_has_room: { some: {room: {is: {name: {contains: room}}}} }})
	}
	if (holder) {
		whereCondition.push({
			authorization_has_holder: {
				some: {
					holder: {
						OR: [
							{ name: { contains: holder } },
							{ surname: { contains: holder } },
							{ email: { contains: holder } },
							{ sciper: parseInt(holder) },
						],
					},
				},
			}
		})
	}
	if (cas) {
		whereCondition.push({ authorization_has_chemical: { some: {chemical: {
						OR: [
							{ cas_auth_chem: { contains: cas } },
							{ auth_chem_en: { contains: cas } }
						],
					}} }})
	}
	if (source) {
		whereCondition.push({ authorization_has_radiation: { some: {source: {contains: source}} }})
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

	const authorizations = take == 0 ? authorizationList : authorizationList.slice(skip, skip + take);
	const totalCount = authorizationList.length;

	return { authorizations, totalCount };
}

export async function getTheAuthorization(prisma, authNumber: string, type: string) {
	const whereCondition = [];
	whereCondition.push({ type: type})
	whereCondition.push({ authorization: authNumber })

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
		throw new Error(`No ${type} authorization found for ${authNumber}`);
	} else if (authorizationList.length > 1) {
		throw new Error(`More than one ${type} authorization found: ${authorizationList.map(auth => auth.authorization).join(', ')} for ${authNumber}`);
	} else {
		return authorizationList[0];
	}
}

async function setAuthorizationRelations(tx, id_authorization: number, changes: AuthorizationChanges) {
	for ( const holder of changes.holders || []) {
		if ( holder.status === 'New' ) {
			let p = await tx.Person.findUnique({where: {sciper: holder.sciper}});

			const relation = {
				id_person: Number(p.id_person),
				id_authorization: id_authorization
			};
			await tx.authorization_has_holder.create({
				data: relation
			});
		} else if ( holder.status === 'Deleted' ) {
			let p = await tx.Person.findUnique({where: {sciper: holder.sciper}});
			if ( p ) {
				const whereCondition = {
					id_authorization: id_authorization,
					id_person: p.id_person
				};
				await tx.authorization_has_holder.deleteMany({
					where: whereCondition
				});
			}
		}
	}

	for ( const room of changes.rooms || []) {
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
				id_authorization: id_authorization
			};
			await tx.authorization_has_room.create({
				data: relation
			});
		} else if ( room.status === 'Deleted' ) {
			let p = await tx.Room.findFirst({where: {name: room.name}});
			if ( p ) {
				const whereCondition = {
					id_authorization: id_authorization,
					id_lab: p.id
				};
				await tx.authorization_has_room.deleteMany({
					where: whereCondition
				});
			}
		}
	}

	for ( const source of changes.radiations || []) {
		if ( source.status === 'New' ) {
			const relation = {
				id_authorization: id_authorization,
				source: source.name
			};
			await tx.authorization_has_radiation.create({
				data: relation
			});
		} else if ( source.status === 'Deleted' ) {
			const whereCondition = {
				id_authorization: id_authorization,
				source: source.name
			};
			await tx.authorization_has_radiation.deleteMany({
				where: whereCondition
			});
		}
	}

	for ( const cas of changes.cas || []) {
		if ( cas.status === 'New' ) {
			let p = await tx.auth_chem.findUnique({where: {cas_auth_chem: cas.name}});

			if ( !p ) {
				throw new NotFoundError(`CAS ${cas.name} not found`);
			}

			const relation = {
				id_chemical: Number(p.id_auth_chem),
				id_authorization: id_authorization
			};
			await tx.authorization_has_chemical.create({
				data: relation
			});
		} else if ( cas.status === 'Deleted' ) {
			let p = await tx.auth_chem.findUnique({where: {cas_auth_chem: cas.name}});
			if (p) {
				const whereCondition = {
					id_authorization: id_authorization,
					id_chemical: p.id_auth_chem
				};
				await tx.authorization_has_chemical.deleteMany({
					where: whereCondition
				});
			}
		}
	}
}

export async function expireAuthorization (tx, auth) {
	return await tx.authorization.update({
		where: { id_authorization: auth.id_authorization },
		data: {
			status: 'Expired'
		}
	});
}

export async function setAuthorizationNotified (tx, auth) {
	return await tx.authorization.update({
		where: { id_authorization: auth.id_authorization },
		data: {
			date_expiry_notified: new Date()
		}
	});
}

export async function getExpiringAuthorizations (prisma, expiringInDays: number = 30) {
	const expirationDay = new Date();
	expirationDay.setDate(expirationDay.getDate() + expiringInDays);

	const conditions = {
		expiration_date: {
			lt: expirationDay     // less than `expiringInDays` from now
		},
		status: 'Active'
	};

	if (expiringInDays !== 0) {
		conditions['date_expiry_notified'] = null;
	}

	return await prisma.authorization.findMany({
		where: conditions
	});
}
