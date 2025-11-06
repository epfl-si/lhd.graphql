/**
 * GraphQL types and queries for Room's and RoomKind's
 */

import {HazLevelStruct} from '../hazards/hazlevel';
import {BioStruct} from '../bio/biohazard';
import {DispensationStruct} from '../dispensations';
import {booleanArg, enumType, extendType, inputObjectType, intArg, list, objectType, stringArg} from 'nexus';
import {Room, RoomKind} from 'nexus-prisma';
import {debug as debug_} from 'debug';
import {UnitMutationType, UnitStruct} from "../roomdetails/units";
import {mutationStatusType} from "../statuses";
import {LabHazardStruct} from "../hazards/labHazard";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";
import {getDoorPlugFromApi, getRoomsFromApi} from "../../utils/CallAPI";
import {HazardsAdditionalInfoStruct} from "../hazards/hazardsAdditionalInfo";
import {LabHazardChildStruct} from "../hazards/labHazardChild";

const debug = debug_('lhd:rooms');

const catalyseSpecialLocations = {
	stockroom: [
		'CH F0 524',
		'GC B0 406',
		'GC B1 404',
		'GC G0 504',
		'PH H0 473',
		'PPH 023',
		'SV 0835',
		'MXD 122',
	],
	receivingLocation: ['CH G0 501'],
};

export const LocationEnum = enumType({
	name: 'Location',
	members: ['Lausanne', 'Sion', 'Neuchatel'],
});

export const CatalyseTypeEnum = enumType({
	name: 'CatalyseType',
	members: ['stockroom', 'receivingLocation'],
});

export const RoomStruct = objectType({
	name: Room.$name,
	description: `A room on EPFL campus or any of the satellite locations.`,
	definition(t) {
		for (const f of [
			'name',
			'building',
			'sector',
			'floor',
			'roomNo',
			'kind',
			'vol',
			'vent',
			'site',
			'lab_type_is_different'
		]) {
			t.field(Room[f]);
		}

		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id, obj: getRoomToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});

		t.string('adminuse',  {
			resolve: async (parent, _, context) => {
				const rooms = await getRoomsFromApi(parent.name);
				return (rooms && rooms["rooms"].length > 0) ? rooms["rooms"][0].adminuse : '';
			},
		});

		t.string('facultyuse',  {
			resolve: async (parent, _, context) => {
				const rooms = await getRoomsFromApi(parent.name);
				return (rooms && rooms["rooms"].length > 0) ? rooms["rooms"][0].facultyuse : '';
			},
		});

		t.string('assignedTo',  {
			resolve: async (parent, _, context) => {
				const rooms = await getRoomsFromApi(parent.name);
				if (rooms && rooms["rooms"].length > 0) {
					const room = rooms["rooms"][0];
					return room['unit'] ? room['unit']['name'] : '';
				} else {
					return '';
				}
			},
		});

		t.field('catalyseType', {
			type: 'CatalyseType',
			resolve(room) {
				for (const k in catalyseSpecialLocations) {
					if (catalyseSpecialLocations[k].includes(room.name)) {
						return k as keyof typeof catalyseSpecialLocations;
					}
				}
				return null;
			},
		});

		t.nonNull.list.nonNull.field('occupancies', {
			type: 'Occupancy',
			async resolve(parent, _, context) {
				return [];
			},
		});

		t.field('bio', {
			type: BioStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.bio.findUnique({
					where: { id_lab: parent.id },
					include: { bio_org_lab: { include: { bio_org: true } } },
				});
			},
		});

		t.nonNull.list.nonNull.field('lhd_units', {
			type: UnitStruct,
			resolve: async (parent, _, context) => {
				const unitsAndRooms = await context.prisma.unit_has_room.findMany({
					where: { id_lab: parent.id }
				});
				const unitIDs = new Set(unitsAndRooms.map((unitAndRoom) => unitAndRoom.id_unit));
				return await context.prisma.Unit.findMany({
					where: { id: { in: [...unitIDs] }}
				})
			},
		});

		t.list.field('haz_levels', {
			type: HazLevelStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.cad_lab.findMany({
					where: { id_lab: parent.id },
					include: { haz: true },
				});
			},
		});

		t.nonNull.list.nonNull.field('hazards', {
			type: LabHazardStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.lab_has_hazards.findMany({//submission
					where: { id_lab: (parent as any).id },
					include: { hazard_form_history: true }
				});
			}
		});
		t.nonNull.list.nonNull.field('hazardAdditionalInfo',  {
			type: HazardsAdditionalInfoStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.lab_has_hazards_additional_info.findMany({
					where: { id_lab: (parent as any).id },
					include: { hazard_category: true }
				});
			}
		});
		t.nonNull.list.nonNull.field('hazardReferences',  {
			type: LabHazardChildStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.lab_has_hazards_child.findMany({
					where: { submission:  {
							contains: '\"' + (parent as any).name + '\"'
						}},
				});
			}
		});

		t.float('yearly_audits', {
			resolve: async (parent, _, context) => {
				const naudits = await context.prisma.naudits.findMany({
					where: { id_lab: parent.id },
				});
				// For some reason this is a 1:n relationship in the LHDv2
				// database ‽
				return naudits[naudits.length - 1]?.naudits;
			},
		});
		t.nonNull.list.nonNull.field('dispensations', {
			type: DispensationStruct,
			description: `The list of all dispensations that concern or have ever concerned this room.`,
			async resolve(parent, _, context) {
				const id_lab = parent.id;
				const dispensationsInRoom =
					await context.prisma.DispensationInRoomRelation.findMany({
						where: { id_room: parent.id },
						include: { dispensation_version: { include: { dispensation: true } } },
					});
				return dispensationsInRoom
					.map(dr => dr?.dispensation_version?.dispensation)
					.filter(d => d !== undefined);
			},
		});
	},
});

function getRoomToString(parent) {
	return {
		id: parent.id,
		sciper_lab: parent.sciper_lab,
		building: parent.building,
		sector: parent.sector,
		floor: parent.floor,
		roomNo:	parent.roomNo,
		id_labType:	parent.id_labType,
		description: parent.description,
		location: parent.location,
		vol: parent.vol,
		vent:	parent.vent,
		name:	parent.name
	};
}

export const RoomKindStruct = objectType({
	name: RoomKind.$name,
	definition(t) {
		t.field(RoomKind.name);
	},
});

export const RoomQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.rooms({ filtering: true,
			resolve: async (root, args, context, info, originalResolve) => {
				// Ensure user is authenticated
				if (!context.user) {
					throw new Error('Unauthorized');
				}

				// Check if user has the right to access rooms
				if (!context.user.canListRooms) {
					throw new Error('Permission denied');
				}

				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			}
		});
	},
});

export const RoomsWithPaginationStruct = objectType({
	name: 'RoomsWithPagination',
	definition(t) {
		t.list.field('rooms', { type: 'Room' });
		t.int('totalCount');
	},
});

export const RoomsWithPaginationQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("roomsWithPagination", {
			type: "RoomsWithPagination",
			args: {
				skip: intArg({ default: 0 }),
				take: intArg({ default: 20 }),
				search: stringArg(),
			},
			authorize: (parent, args, context) => context.user.canListRooms,
			async resolve(parent, args, context) {
				return await getRoomsWithPagination(args, context);
			}
		});
	},
});

export async function getRoomsWithPagination(args, context) {
	const queryArray = args.search.split("&");
	const dictionary = queryArray.map(query => query.split("="));
	const whereCondition = [];
	if (dictionary.length == 0) {
		whereCondition.push({ name: { contains: '' }})
	} else {
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
	}

	const roomsList = await context.prisma.Room.findMany({
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

export const RoomKindQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.roomKinds({ filtering: true,
			resolve: async (root, args, context, info, originalResolve) => {
				// Ensure user is authenticated
				if (!context.user) {
					throw new Error('Unauthorized');
				}

				// Check if user has the right to access rooms (customize this logic)
				if (!context.user.canListRooms) {
					throw new Error('Permission denied');
				}

				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			}
		});
	},
});

const roomType = {
	id: stringArg(),
	name: stringArg(),
	kind: stringArg(),
	vent: stringArg(),
	lab_type_is_different: booleanArg(),
	units: list(UnitMutationType)
};

const roomCreationType = {
	rooms: list("RoomCreationType")
};

export const RoomCreationType = inputObjectType({
	name: "RoomCreationType",
	definition(t) {
		t.nonNull.int('id');
		t.nonNull.string('name');
		t.nonNull.string('status');
		t.string('site');
		t.string('floor');
		t.string('building');
		t.string('sector');
		t.float('vol');
		t.string('facultyuse');
	}
})

export const RoomStatus = mutationStatusType({
	name: "RoomStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the new Room's object identity; may be thereafter passed to e.g. \`updateRoom\``});
	}
});

const roomDeleteType = {
	id: stringArg()
};

export const RoomMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('createRoom', {
			description: `Create a new room.`,
			args: roomCreationType,
			type: "RoomStatus",
			authorize: (parent, args, context) => context.user.canEditRooms,
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						for (const room of args.rooms) {
							if (room.status == 'New') {
								const newRoom = await tx.Room.findUnique({ where: { sciper_lab: room.id }});

								if (!newRoom) {
									const parts: string[] = room.name.split(' ');

									const labType = await tx.RoomKind.findFirst({where: {name: room.facultyuse}});
									await tx.Room.create({
										data: {
											sciper_lab: room.id,
											building: room.building,
											sector: room.sector,
											floor: room.floor,
											roomNo: parts[parts.length - 1],
											name: room.name,
											site: room.site,
											vol: room.vol,
											lab_type_is_different: false,
											id_labType: labType ? labType.id_labType : null
										}
									});
								}
							}
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('updateRoom', {
			description: `Update room details.`,
			args: roomType,
			type: "RoomStatus",
			authorize: (parent, args, context) => context.user.canEditRooms,
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						const id = IDObfuscator.getId(args.id);
						const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
						const room = await tx.Room.findUnique({where: {id: idDeobfuscated}});
						if (! room) {
							throw new Error(`Room ${args.name} not found.`);
						}
						const roomObject =  getSHA256(JSON.stringify(getRoomToString(room)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== roomObject) {
							throw new Error(`Room ${args.name} has been changed from another user. Please reload the page to make modifications`);
						}

						const roomKind = await tx.RoomKind.findFirst({where: {name: args.kind}})
						await tx.Room.update(
							{ where: { id: room.id },
								data: {
									vent: args.vent,
									lab_type_is_different: args.lab_type_is_different,
									kind: { connect: { id_labType: roomKind.id_labType}},
								}
							});

						const errors: string[] = [];
						for (const unitToChange of args.units) {

							const unit = await tx.Unit.findFirst({ where: { name: unitToChange.name }});

							if (!unit) {
								errors.push(`Unit ${unitToChange.name} not found.`);
								continue;
							}
							if (unitToChange.status == 'New') {
								try {
									await tx.unit_has_room.create({
										data: {
											id_lab: room.id,
											id_unit: unit.id
										}
									})
								} catch ( e ) {
									errors.push(`Error creating unit ${unit.name}.`);
								}
							}
							else if (unitToChange.status == 'Deleted') {
								try {
									const whereConditionForDelete = {
										id_lab: room.id,
										id_unit: unit.id
									};
									await tx.unit_has_room.deleteMany({
										where: whereConditionForDelete
									});
								} catch ( e ) {
									errors.push(`Error creating unit ${unit.name}.`);
								}
							}  // Else do nothing (client should not transmit these, but oh well)
						}

						if (errors.length > 0) {
							throw new Error(`${errors.join('\n')}`);
						} else {
							return mutationStatusType.success();
						}
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('deleteRoom', {
			description: `Delete room details by room id (units and hazards too).`,
			args: roomDeleteType,
			type: "RoomStatus",
			authorize: (parent, args, context) => context.user.canEditRooms,
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						const id = IDObfuscator.getId(args.id);
						const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
						const room = await tx.Room.findUnique({where: {id: idDeobfuscated}});
						if (! room) {
							throw new Error(`Room not found.`);
						}
						const roomObject =  getSHA256(JSON.stringify(getRoomToString(room)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== roomObject) {
							throw new Error(`Room has been changed from another user. Please reload the page to make modifications`);
						}

						const errors: string[] = [];
						try {
							errors.push(...await deleteRoom(tx, context, room));
						} catch ( e ) {
							errors.push(`Error updating unit.`)
						}

						if (errors.length > 0) {
							throw new Error(`${errors.join('\n')}`);
						} else {
							return mutationStatusType.success();
						}
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
	}
});

async function writeDeletionLog(obj: any, tx, context, objName: string, r: Room) {
	const errors: string[] = [];
	if ( !obj ) {
		errors.push(`Error deleting ${objName} for ${r.name}.`);
	}
	return errors;
}

async function deleteRoomObject(obj: any, r: Room, tx, context) {
	const objDeleted = await obj.deleteMany({
		where: {
			id_lab: r.id,
		}
	});
	return await writeDeletionLog(objDeleted, tx, context, obj.name, r);
}

async function deleteRoom(tx, context, r:Room) {
	let errors: string[] = [];
	try {
		const where = { where: { id_lab: r.id } }

		const bioOrg = await context.prisma.bio.findMany({ where: { id_lab: r.id } });
		bioOrg.forEach(async (h) => {
			const child = await tx.bio_org_lab.deleteMany({
				where: {
					id_bio: h.id_bio
				}
			});
			errors.push(...await writeDeletionLog(child, tx, context, tx.bio_org_lab.name, r));
		})

		const hazards = await context.prisma.lab_has_hazards.findMany({ where: { id_lab: r.id } });
		hazards.forEach(async (h) => {
			const child = await tx.lab_has_hazards_child.deleteMany({
				where: {
					id_lab_has_hazards: h.id_lab_has_hazards
				}
			});
			errors.push(...await writeDeletionLog(child, tx, context, tx.lab_has_hazards_child.name, r));
		})

		errors.push(...await writeDeletionLog(await tx.aa.deleteMany(where), tx, context, tx.aa.name, r));
		errors.push(...await writeDeletionLog(await tx.auth_lab.deleteMany(where), tx, context, tx.auth_lab.name, r));
		errors.push(...await writeDeletionLog(await tx.bio.deleteMany(where), tx, context, tx.bio.name, r));
		errors.push(...await writeDeletionLog(await tx.cad_corr.deleteMany(where), tx, context, tx.cad_corr.name, r));
		errors.push(...await writeDeletionLog(await tx.cad_lab.deleteMany(where), tx, context, tx.cad_lab.name, r));
		errors.push(...await writeDeletionLog(await tx.cut.deleteMany(where), tx, context, tx.cut.name, r));
		errors.push(...await writeDeletionLog(await tx.dewar.deleteMany(where), tx, context, tx.dewar.name, r));
		errors.push(...await writeDeletionLog(await tx.elec.deleteMany(where), tx, context, tx.elec.name, r));
		errors.push(...await writeDeletionLog(await tx.mag_f.deleteMany(where), tx, context, tx.mag_f.name, r));
		errors.push(...await writeDeletionLog(await tx.mag.deleteMany(where), tx, context, tx.mag.name, r));
		errors.push(...await writeDeletionLog(await tx.gaschem.deleteMany(where), tx, context, tx.gaschem.name, r));
		errors.push(...await writeDeletionLog(await tx.gnb_labsto.deleteMany(where), tx, context, tx.gnb_labsto.name, r));
		errors.push(...await writeDeletionLog(await tx.haz_date.deleteMany(where), tx, context, tx.haz_date.name, r));
		errors.push(...await writeDeletionLog(await tx.irad.deleteMany(where), tx, context, tx.irad.name, r));
		errors.push(...await writeDeletionLog(await tx.lab_has_hazards.deleteMany(where), tx, context, tx.lab_has_hazards.name, r));
		errors.push(...await writeDeletionLog(await tx.lab_has_hazards_additional_info.deleteMany(where), tx, context, tx.lab_has_hazards_additional_info.name, r));
		errors.push(...await writeDeletionLog(await tx.laser.deleteMany(where), tx, context, tx.laser.name, r));
		errors.push(...await writeDeletionLog(await tx.nano.deleteMany(where), tx, context, tx.nano.name, r));
		errors.push(...await writeDeletionLog(await tx.naudits.deleteMany(where), tx, context, tx.naudits.name, r));
		errors.push(...await writeDeletionLog(await tx.nirad.deleteMany(where), tx, context, tx.nirad.name, r));
		errors.push(...await writeDeletionLog(await tx.noise.deleteMany(where), tx, context, tx.noise.name, r));
		errors.push(...await writeDeletionLog(await tx.tdegree.deleteMany(where), tx, context, tx.tdegree.name, r));
		errors.push(...await writeDeletionLog(await tx.unit_has_room.deleteMany(where), tx, context, tx.unit_has_room.name, r));
		errors.push(...await writeDeletionLog(await tx.unit_has_storage_for_room.deleteMany(where), tx, context, tx.unit_has_storage_for_room.name, r));

		const disp = await tx.DispensationInRoomRelation.deleteMany({
			where: {
				id_room: r.id,
			}
		});
		errors.push(...await writeDeletionLog(disp, tx, context, tx.DispensationInRoomRelation.name, r));

		await tx.Room.delete({
			where: {
				id: r.id,
			},
		});
	} catch ( e ) {
		errors.push(`Error deleting ${r.name}: ${e.message}.`);
	}
	return errors;
}

export const RoomFromAPI = objectType({
	name: "RoomFromAPI",
	definition(t) {
		t.nonNull.string("name");
		t.string("floor");
		t.nonNull.int("id");
		t.string("sector");
		t.string("site");
		t.string("building");
		t.float("vol");
		t.string("facultyuse");
	}
})

export const RoomFromAPIQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("roomsFromAPI", {
			type: list("RoomFromAPI"),
			args: {
				search: stringArg()
			},
			authorize: (parent, args, context) => context.user.canListRooms,
			async resolve(parent, args, context): Promise<any> {
				const rooms = await getRoomsFromApi(args.search);
				const roomsList = [];
				rooms["rooms"].forEach(u =>
				{
					roomsList.push({
						name: u.name,
						floor: u.floor,
						id: u.id,
						building: u.building['name'],
						sector: u.zone != 'Z' ? u.zone : '',
						vent: 'n',
						site: u.building?.site?.label,
						vol: Math.round(((u.surface || 0) * (u.height || 0)) * 100) / 100,
						facultyuse: u.facultyuse,
						lab_type_is_different: false
					});
				});
				return roomsList;
			}
		})
	},
})

export const DoorPlugQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("fetchDoorPlug", {
			type: "String",
			args: {
				roomName: stringArg()
			},
			async resolve(parent, args, context): Promise<any> {
				const file = await getDoorPlugFromApi(args.roomName);
				return "" //file.v_epfl_fiches.url;
			}
		})
	},
})
