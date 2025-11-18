import {Room} from "nexus-prisma";

export async function getRoomsWithPagination(args, prisma) {
	const queryArray = args.search.split("&");
	const dictionary = queryArray.map(query => query.split("="));
	const whereCondition = [];
	whereCondition.push({ isDeleted: false });
	dictionary.forEach(query => {
			const value = decodeURIComponent(query[1]);
			if (query[0] == 'Room') {
				whereCondition.push({ name: { contains: value }})
			} else if (query[0] == 'Hazard') {
				whereCondition.push({ lab_has_hazards : {some: {hazard_form_history: { is: {hazard_form: { is: {hazard_category: { is: {hazard_category_name: { contains: value }}}}}}}}}})
			} else if (query[0] == 'Designation') {
				whereCondition.push({ kind : { is: {name: { contains: value }}}})
			} else if (query[0] == 'Floor') {
				whereCondition.push({ floor: { contains: value }})
			} else if (query[0] == 'Sector') {
				whereCondition.push({ sector: { contains: value }})
			} else if (query[0] == 'Building') {
				whereCondition.push({ building: { contains: value }})
			} else if (query[0] == 'Unit') {
				whereCondition.push({
					OR: [
						{ unit_has_room: { some: {unit: {is: {name: {contains: value}}}} }},
						{ unit_has_room: { some: {unit: {is: {institute: {is: {name: {contains: value}}}}}} }},
						{ unit_has_room: { some: {unit: {is: {institute: {is: {school: {is: {name: {contains: value}}}}}}}} }}
					]
				})
			} else if (query[0] == 'Volume' && !isNaN(parseFloat(value))) {
				whereCondition.push({ vol: { gt: parseFloat(value) - 10, lt: parseFloat(value) + 10 } })
			} else if (query[0] == 'Cosec') {
				whereCondition.push({
					unit_has_room: {
						some: {
							unit: {
								unit_has_cosec: {
									some: {
										cosec: {
											OR: [
												{ name: { contains: value } },
												{ surname: { contains: value } },
												{ email: { contains: value } },
											],
										},
									},
								},
							},
						},
					},
				})
			} else if (query[0] == 'Prof') {
				whereCondition.push({
					unit_has_room: {
						some: {
							unit: {
								subunpro: {
									some: {
										person: {
											OR: [
												{ name: { contains: value } },
												{ surname: { contains: value } },
												{ email: { contains: value } },
											],
										},
									},
								},
							},
						},
					},
				})
			}
		})

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

	const rooms = args.take == 0 ? roomsList : roomsList.slice(args.skip, args.skip + args.take);
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

	const auth = await context.prisma.authorization_has_room.findMany(where);
	for ( const a of auth ) {
		const date = (new Date()).toLocaleDateString("en-GB");
		const [dayCrea, monthCrea, yearCrea] = date.split("/").map(Number);
		await tx.authorization.update(
			{ where: { id_authorization: a.id_authorization },
				data: {
					status: 'Expired',
					expiration_date: new Date(yearCrea, monthCrea - 1, dayCrea, 12),
				}
			});
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
