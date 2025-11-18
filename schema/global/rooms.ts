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
import {IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";
import {getDoorPlugFromApi, getRoomsFromApi} from "../../utils/CallAPI";
import {HazardsAdditionalInfoStruct} from "../hazards/hazardsAdditionalInfo";
import {LabHazardChildStruct} from "../hazards/labHazardChild";
import {deleteRoom, getRoomsWithPagination} from "../../controllers/rooms";

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
			'lab_type_is_different',
			'isDeleted'
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
		name:	parent.name,
		isDeleted: parent.isDeleted
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
			authorize: (parent, args, context) => context.user.canListRooms,
			resolve: async (root, args, context, info, originalResolve) => {
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
				return await getRoomsWithPagination(args, context.prisma);
			}
		});
	},
});

export const RoomKindQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.roomKinds({ filtering: true,
			authorize: (parent, args, context) => context.user.canListRooms,
			resolve: async (root, args, context, info, originalResolve) => {
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
			}
		});
		t.nonNull.field('updateRoom', {
			description: `Update room details.`,
			args: roomType,
			type: "RoomStatus",
			authorize: (parent, args, context) => context.user.canEditRooms,
			async resolve(root, args, context) {
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

					for (const unitToChange of args.units) {
						const unit = await tx.Unit.findFirst({ where: { name: unitToChange.name }});
						if (unitToChange.status == 'New') {
							await tx.unit_has_room.create({
								data: {
									id_lab: room.id,
									id_unit: unit.id
								}
							})
						}
						else if (unitToChange.status == 'Deleted') {
							const whereConditionForDelete = {
								id_lab: room.id,
								id_unit: unit.id
							};
							await tx.unit_has_room.deleteMany({
								where: whereConditionForDelete
							});
						}
					}

					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('deleteRoom', {
			description: `Delete room details by room id (units and hazards too).`,
			args: roomDeleteType,
			type: "RoomStatus",
			authorize: (parent, args, context) => context.user.canEditRooms,
			async resolve(root, args, context) {
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
					await deleteRoom(tx, context, room);
					return mutationStatusType.success();
				});
			}
		});
	}
});

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
