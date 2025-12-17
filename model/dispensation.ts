import {NotFoundError} from "../utils/errors";

export async function checkRelationsForDispensation(tx, args, authorization) {
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
