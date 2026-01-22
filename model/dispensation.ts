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

	for ( const unit of args.units || []) {
		const u = await tx.Unit.findFirst({where: {name: unit.name}});
		if ( unit.status === 'New' ) {
			if ( !u ) throw new Error(`Dispensation not created: unit not found`);
			await tx.dispensation_has_unit.create({
				data: {
					id_unit: Number(u.id),
					id_dispensation: Number(dispensation.id_dispensation)
				}
			});
		} else if ( unit.status === 'Deleted' && u) {
			await tx.dispensation_has_unit.deleteMany({
				where: {
					id_dispensation: dispensation.id_dispensation,
					id_unit: u.id
				}
			});
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

export async function getExpiredDispensations (prisma) {
	return await prisma.dispensation.findMany({
		where: { date_end: { lt: new Date() }, status: 'Active' }
	});
}

export async function expireDispensation (tx, disp, userInfo) {
	return await tx.dispensation.update({
		where: { id_dispensation: disp.id_dispensation },
		data: {
			status: 'Expired',
			modified_by: userInfo.username,
			modified_on: new Date()
		}
	});
}

export async function getDispensation (prisma, id) {
	return await prisma.dispensation.findUnique({
		where: { id_dispensation: id },
		include: {
			subject: true,
			dispensation_has_room : { include: { room: true } },
			dispensation_has_holder: { include: { holder: true } },
			dispensation_has_ticket: true
		}
	});
}

export async function getExpiringDispensations (prisma) {
	const thirtyDaysFromNow = new Date();
	thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

	return await prisma.dispensation.findMany({
		where: {
			date_end: {
				gte: new Date(),           // greater than or equal to now (not expired yet)
				lte: thirtyDaysFromNow     // less than or equal to 30 days from now
			},
			status: 'Active'
		},
		include: {
			subject: true,
			dispensation_has_room : { include: { room: true } },
			dispensation_has_holder: { include: { holder: true } },
			dispensation_has_ticket: true
		}
	});
}
