import {Room} from "nexus-prisma";
import {getFormattedDate} from "../utils/date";
import {alphanumericRegexp, roomNameRegexp} from "../api/lib/lhdValidators";

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

export async function deleteRoom(tx, context, r:Room) {
	const where = { where: { id_lab: r.id } }

	const bioOrg = await context.prisma.bio.findMany(where);
	for ( const h of bioOrg ) {
		await tx.bio_org_lab.deleteMany({
			where: {
				id_bio: h.id_bio
			}
		});
	}

	const hazards = await context.prisma.lab_has_hazards.findMany(where);
	for ( const h of hazards ) {
		await tx.lab_has_hazards_child.deleteMany({
			where: {
				id_lab_has_hazards: h.id_lab_has_hazards
			}
		});
	}

	const dewar = await context.prisma.dewar.findMany(where);
	for ( const d of dewar ) {
		await tx.cryo.deleteMany({
			where: {
				id_dewar: d.id_dewar
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
		if (authChem.length == 1) {
			const date = getFormattedDate(new Date());
			const [dayCrea, monthCrea, yearCrea] = date.split("/").map(Number);
			await tx.authorization.update(
				{ where: { id_authorization: a.id_authorization },
					data: {
						status: 'Expired',
						expiration_date: new Date(yearCrea, monthCrea - 1, dayCrea, 12),
					}
				});
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
			const date = getFormattedDate(new Date());
			const [dayCrea, monthCrea, yearCrea] = date.split("/").map(Number);
			await tx.Dispensation.update(
				{ where: { id_dispensation: a.id_dispensation },
					data: {
						status: 'Expired',
						date_end: new Date(yearCrea, monthCrea - 1, dayCrea, 12),
					}
				});
		}
	}

	await tx.aa.deleteMany(where);
	await tx.auth_lab.deleteMany(where);
	await tx.bio.deleteMany(where);
	await tx.cad_corr.deleteMany(where);
	await tx.cad_lab.deleteMany(where);
	await tx.cut.deleteMany(where);
	await tx.dewar.deleteMany(where);
	await tx.elec.deleteMany(where);
	await tx.mag_f.deleteMany(where);
	await tx.mag.deleteMany(where);
	await tx.gaschem.deleteMany(where);
	await tx.gnb_labsto.deleteMany(where);
	await tx.haz_date.deleteMany(where);
	await tx.irad.deleteMany(where);
	await tx.lab_has_hazards.deleteMany(where);
	await tx.lab_has_hazards_additional_info.deleteMany(where);
	await tx.laser.deleteMany(where);
	await tx.nano.deleteMany(where);
	await tx.naudits.deleteMany(where);
	await tx.nirad.deleteMany(where);
	await tx.noise.deleteMany(where);
	await tx.tdegree.deleteMany(where);
	await tx.unit_has_room.deleteMany(where);
	await tx.unit_has_storage_for_room.deleteMany(where);

	await tx.DispensationInRoomRelation.deleteMany({
		where: {
			id_room: r.id
		}
	});

	await tx.Room.update(
		{ where: { id: r.id },
			data: {
				isDeleted: true
			}
		});
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
