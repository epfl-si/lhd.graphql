import {Room} from "nexus-prisma";
import {expireDispensation, getDispensation} from "./dispensation";
import {expireAuthorization} from "./authorization";

export async function getRooms(prisma, dictionary?: Partial<{
	hazard: string,
	room: string,
	designation: string,
	floor: string,
	sector: string,
	building: string,
	unit: string,
	cosec: string,
	volume: number,
	prof: string
}>, take = 0, skip = 0) {
	const { hazard, room, designation, floor, sector, building, unit, cosec, volume, prof } = dictionary || {};

	const whereCondition = [];
	whereCondition.push({ isDeleted: false });
			if (room) {
				whereCondition.push({ name: { contains: room }})
			}
			if (hazard) {
				whereCondition.push({ lab_has_hazards : {some: {hazard_form_history: { is: {hazard_form: { is: {hazard_category: { is: {hazard_category_name: { contains: hazard }}}}}}}}}})
			}
			if (designation) {
				whereCondition.push({ kind : { is: {name: { contains: designation }}}})
			}
			if (floor) {
				whereCondition.push({ floor: { contains: floor }})
			}
			if (sector) {
				whereCondition.push({ sector: { contains: sector }})
			}
			if (building) {
				whereCondition.push({ building: { contains: building }})
			}
			if (unit) {
				whereCondition.push({
					OR: [
						{ unit_has_room: { some: {unit: {is: {name: {contains: unit}}}} }},
						{ unit_has_room: { some: {unit: {is: {institute: {is: {name: {contains: unit}}}}}} }},
						{ unit_has_room: { some: {unit: {is: {institute: {is: {school: {is: {name: {contains: unit}}}}}}}} }}
					]
				})
			}
			if (volume) {
				whereCondition.push({ vol: { gt: volume - 10, lt: volume + 10 } })
			}
			if (cosec) {
				whereCondition.push({
					unit_has_room: {
						some: {
							unit: {
								unit_has_cosec: {
									some: {
										cosec: {
											OR: [
												{ name: { contains: cosec } },
												{ surname: { contains: cosec } },
												{ email: { contains: cosec } },
											],
										},
									},
								},
							},
						},
					},
				})
			}
			if (prof) {
				whereCondition.push({
					unit_has_room: {
						some: {
							unit: {
								subunpro: {
									some: {
										person: {
											OR: [
												{ name: { contains: prof } },
												{ surname: { contains: prof } },
												{ email: { contains: prof } },
											],
										},
									},
								},
							},
						},
					},
				})
			}

	const roomsList = await prisma.Room.findMany({
		where: {
			AND: whereCondition
		},
		include: { unit_has_room: { include: { unit: true } } },
		orderBy: [
			{
				name: 'asc',
			},
		]
	});

	const rooms = take == 0 ? roomsList : roomsList.slice(skip, skip + take);
	const totalCount = roomsList.length;

	return { rooms, totalCount };
}

export async function deleteRoom(tx, context, r:Room, infoUser) {
	const emails = {dispensations: []};

	const where = { where: { id_lab: r.id } }

	const hazards = await context.prisma.lab_has_hazards.findMany(where);
	for ( const h of hazards ) {
		await tx.lab_has_hazards_child.deleteMany({
			where: {
				id_lab_has_hazards: h.id_lab_has_hazards
			}
		});
	}

	const auth = await context.prisma.authorization_has_room.findMany({
		where: {
			AND: [
				{ id_lab: r.id },
				{
					authorization: {
						type: 'Chemical',
					},
				}
			]
		}
	});
	for ( const a of auth ) {
		const authChem = await context.prisma.authorization_has_room.findMany({
			where: {
				AND: [
					{ id_authorization: a.id_authorization },
					{ room: { isDeleted: false },
					}
				]
			}
		});
		if (authChem.length == 1) { // If the current room is the only one still active
			await expireAuthorization(tx, a);
		}
	}

	const disps = await context.prisma.DispensationHasRoom.findMany({
		where: { id_lab: r.id }
	});
	for ( const a of disps ) {
		const disp = await context.prisma.DispensationHasRoom.findMany({
			where: {
				AND: [
					{ id_dispensation: a.id_dispensation },
					{ room: { isDeleted: false },
					}
				]
			}
		});
		if (disp.length == 1) { // If the current room is the only one still active
			await expireDispensation(tx, a, infoUser);
			emails.dispensations.push(await getDispensation(tx, a.id_dispensation));
		}
	}

	await tx.lab_has_hazards.deleteMany(where);
	const info = await context.prisma.lab_has_hazards_additional_info.findMany(where);
	for ( const i of info ) {
		await tx.HazardsAdditionalInfoHasTag.deleteMany({
			where: {
				id_lab_has_hazards_additional_info: i.id_lab_has_hazards_additional_info
			}
		});
	}
	await tx.lab_has_hazards_additional_info.deleteMany(where);
	await tx.unit_has_room.deleteMany(where);

	await tx.Room.update(
		{ where: { id: r.id },
			data: {
				isDeleted: true
			}
		});

	return emails;
}

/**
 * Get rooms with details that are relevant for the AxS API.
 *
 * Rooms are joined (via Prisma) with units, Professors and COSECs.
 * Rooms that are not assigned to a unit are filtered out.
 * @param prisma
 * @param roomName
 */
export async function getRoomByNameForAxs(prisma, roomName: string) {
	return await prisma.Room.findFirst({
		where: {
			AND: [
				{ name: { contains: roomName }},
				{ unit_has_room: { some: { }}} // At least one unit is available for this room
			]
		},
		include: {
			unit_has_room: {
				include: {
					unit: {
						include: {
							unit_has_cosec: {
								include: {
									cosec: true
								}
							},
							subunpro: {
								include: {
									person: true
								}
							}
						}
					}
				}
			},
			lab_has_hazards: true,
			lab_has_hazards_additional_info: {
				include: {
					hazard_category: true,
					hazards_additional_info_has_tag: {
						include: {
							tag: true
						}
					}
				}
			}
		},
	});
}
