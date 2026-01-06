export async function checkRelationsForDispensation(tx, args, dispensation) {
	for ( const holder of args.holders || []) {
		const p = await tx.Person.findUnique({where: {sciper: holder.sciper}});
		if ( holder.status === 'New' ) {
			await tx.dispensation_has_holder.create({
				data: {
					id_person: Number(p.id_person),
					id_dispensation: Number(dispensation.id_dispensation)
				}
			});
		} else if ( holder.status === 'Deleted' ) {
			await tx.dispensation_has_holder.deleteMany({
				where: {
					id_dispensation: dispensation.id_dispensation,
					id_person: p.id_person
				}
			});
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
			if ( !r ) throw new Error(`Dispensation not created: room not found`);
			await tx.dispensation_has_room.create({
				data: {
					id_lab: Number(r.id),
					id_dispensation: Number(dispensation.id_dispensation)
				}
			});
		} else if ( room.status === 'Deleted' ) {
			let p = await tx.Room.findFirst({where: {name: room.name}});
			if ( p ) {
				await tx.dispensation_has_room.deleteMany({
					where: {
						id_dispensation: dispensation.id_dispensation,
						id_lab: p.id
					}
				});
			}
		}
	}

	for ( const ticket of args.tickets || []) {
		if ( ticket.status === 'New' ) {
			await tx.dispensation_has_ticket.create({
				data: {
					id_dispensation: Number(dispensation.id_dispensation),
					ticket_number: ticket.name
				}
			});
		} else if ( ticket.status === 'Deleted' ) {
			await tx.dispensation_has_ticket.deleteMany({
				where: {
					id_dispensation: dispensation.id_dispensation,
					ticket_number: ticket.name
				}
			});
		}
	}
}
