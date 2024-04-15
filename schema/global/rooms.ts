/**
 * GraphQL types and queries for Room's and RoomKind's
 */

import { HazLevelStruct } from '../hazards/hazlevel';
import { BioStruct } from '../bio/biohazard';
import {DispensationHolder, DispensationRoom, DispensationStruct} from '../dispensations';
import { Room as roomStruct, Unit } from '@prisma/client';
import {enumType, objectType, extendType, nonNull, stringArg, intArg, list, inputObjectType} from 'nexus';
import { Room, RoomKind, cad_lab } from 'nexus-prisma';
import { debug as debug_ } from 'debug';
import {UnitCreationType, UnitMutationType, UnitStruct} from "../roomdetails/units";
import {mutationStatusType} from "../statuses";
import {PersonStruct} from "./people";
import {LabHazardStruct} from "../hazards/labHazard";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";
import {getNewRoomFromApi, getNewUnitFromApi} from "../../utils/CallAPI";
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
			'vent'
		]) {
			t.field(Room[f]);
		}

		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id, obj: getRoomToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});

		t.field('site', {
			type: 'Location',
			resolve(room) {
				const building = room.building;
				if (building.match('^I1[79]$')) {
					return 'Sion';
				} else if (building === 'MC') {
					return 'Neuchatel';
				} else {
					return 'Lausanne';
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
		t.crud.rooms({ filtering: true });
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
			async resolve(parent, args, context) {
				const roomsList = await context.prisma.Room.findMany({
					where: {
						OR: [
							{ name: { contains: args.search }},
							{ building: { contains: args.search }},
							{ sector: { contains: args.search }},
							{ floor: { contains: args.search }},
							{ lab_has_hazards : {some: {hazard_form_history: { is: {hazard_form: { is: {hazard_category: { is: {hazard_category_name: { contains: args.search }}}}}}}}}},
						]
					},
				});

				const rooms = roomsList.slice(args.skip, args.skip + args.take);
				const totalCount = roomsList.length;

				return { rooms, totalCount };
			}
		});
	},
});

export const RoomKindQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.roomKinds({ filtering: true });
	},
});

const roomType = {
	id: stringArg(),
	name: stringArg(),
	kind: stringArg(),
	vol: intArg(),
	vent: stringArg(),
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
		t.string('floor');
		t.string('building');
		t.string('sector');
	}
})

export const RoomStatus = mutationStatusType({
	name: "RoomStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the new Room's object identity; may be thereafter passed to e.g. \`updateRoom\``});
	}
});

export const RoomMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('createRoom', {
			description: `Create a new room.`,
			args: roomCreationType,
			type: "RoomStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						for (const room of args.rooms) {
							if (room.status == 'New') {
								const newRoom = await tx.Room.findUnique({ where: { sciper_lab: room.id }});

								if (!newRoom) {
									const parts: string[] = room.name.split(' ');

									await tx.Room.create({
										data: {
											sciper_lab: room.id,
											building: room.building,
											sector: room.sector,
											floor: room.floor,
											roomNo: parts[parts.length - 1],
											name: room.name
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
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to update room`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update room`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const room = await tx.Room.findUnique({where: {id: idDeobfuscated}});
						if (! room) {
							throw new Error(`Room ${args.name} not found.`);
						}
						const roomObject =  getSHA256(JSON.stringify(getRoomToString(room)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== roomObject) {
							throw new Error(`Room ${args.name} has been changed from another user. Please reload the page to make modifications`);
						}

						const roomKind = await tx.RoomKind.findFirst({where: {name: args.kind}})
						const updatedRoom = await tx.Room.update(
							{ where: { id: room.id },
								data: {
									vol: args.vol,
									vent: args.vent,
									kind: { connect: { id_labType: roomKind.id_labType}},
								}
							});

						if (!updatedRoom) {
							throw new Error(`Room ${args.name} not updated.`);
						}

						const errors: string[] = [];
						for (const unitToChange of args.units) {

							const unit = await tx.Unit.findFirst({ where: { name: unitToChange.name }});

							if (!unit) {
								errors.push(`Unit ${unitToChange.name} not found.`);
								continue;
							}
							if (unitToChange.status == 'New') {
								try {
									const u = await tx.unit_has_room.create({
										data: {
											id_lab: room.id,
											id_unit: unit.id
										}
									})
									if ( !u ) {
										errors.push(`Error creating unit ${unit.name}.`);
									}
								} catch ( e ) {
									errors.push(`Error creating unit ${unit.name}.`);
								}
							}
							else if (unitToChange.status == 'Deleted') {
								try {
									const u = await tx.unit_has_room.deleteMany({
										where: {
											id_lab: room.id,
											id_unit: unit.id
										},
									});
									if (!u) {
										errors.push(`Error deleting ${unit.name}.`);
									}
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
	}
});

export const RoomFromAPI = objectType({
	name: "RoomFromAPI",
	definition(t) {
		t.nonNull.string("name");
		t.string("floor");
		t.nonNull.int("id");
		t.string("sector");
		t.string("building");
		//t.field("building", {type: BuildingType});
		//lab et location
	}
})

/*export const BuildingType = objectType({
	name: "BuildingType",
	definition(t) {
		t.nonNull.string('name');
	}
})*/

export const RoomFromAPIQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("roomsFromAPI", {
			type: list("RoomFromAPI"),
			args: {
				search: stringArg()
			},
			async resolve(parent, args, context): Promise<any> {
				const rooms = await getNewRoomFromApi(args.search);
				const roomsList = [];
				rooms["rooms"].forEach(u =>
				{
					roomsList.push({
						name: u.name,
						floor: u.floor,
						id: u.id,
						building: u.building['name'],
						sector: u.zone
					});
				});
				return roomsList;
			}
		})
	},
})
