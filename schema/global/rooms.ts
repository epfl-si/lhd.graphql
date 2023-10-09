/**
 * GraphQL types and queries for Room's and RoomKind's
 */

import { HazLevelStruct } from '../hazards/hazlevel';
import { BioStruct } from '../bio/biohazard';
import { DispensationStruct } from '../dispensations';
import { Room as roomStruct, Unit } from '@prisma/client';
import { enumType, objectType, extendType } from 'nexus';
import { Room, RoomKind, cad_lab } from 'nexus-prisma';
import { debug as debug_ } from 'debug';
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
		]) {
			t.field(Room[f]);
		}

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
				interface Occupancy {
					room: roomStruct;
					unit: Unit;
				}
				const occupancies: { [unitID: string]: Occupancy } = {};

				const room = await context.prisma.Room.findUnique({
					where: { id: parent.id },
					include: { labunpe: { include: { unit: true } } },
				});
				for (const labunpe of room.labunpe) {
					const unit = labunpe.unit;
					if (unit) {
						occupancies[labunpe.unit.id] = { room, unit };
					}
				}

				const occupanciesList = Object.values(occupancies).sort((a: any, b: any) =>
					a.room.name.localeCompare(b.room.name)
				);
				debug(occupanciesList);
				return occupanciesList;
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

		t.list.field('haz_levels', {
			type: HazLevelStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.cad_lab.findMany({
					where: { id_lab: parent.id },
					include: { haz: true },
				});
			},
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

export const RoomKindQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.roomKinds({ filtering: true });
	},
});
