/**
 * GraphQL types and queries for Room's and RoomKind's
 */

import { person, Room as roomStruct, unit } from '@prisma/client';
import { enumType, objectType, extendType } from 'nexus';
import { Room, RoomKind } from 'nexus-prisma';
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
	definition(t) {
		for (const f of [
			'id',
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
			resolve: async (parent, _, context) => {
				interface Occupancy {
					cosecs: person[];
					room: roomStruct;
					unit: unit;
				}
				interface Occupancies {
					// “Dict” of Occupancy, keyed by the room ID
					[roomID: string]: { [unitID: string]: Occupancy };
				}

				const occupancies: Occupancies = {};
				for (const labunpe of await context.prisma.labunpe.findMany({
					where: { id_lab: parent.id },
					include: { room: true, cosec: true, unit: true },
				})) {
					if (!occupancies[labunpe.room.id]) {
						// If first-level key is empty, create it:
						occupancies[labunpe.room.id] = {};
					}
					if (!occupancies[labunpe.room.id][labunpe.unit.id]) {
						occupancies[labunpe.room.id][labunpe.unit.id] = {
							room: labunpe.room,
							cosecs: [],
							unit: labunpe.unit,
						};
					}
					occupancies[labunpe.room.id][labunpe.unit.id].cosecs.push(labunpe.cosec);
				}

				// Shake out all Occupancy objects from the Occupancies temporary data structure:
				const occupanciesListList = Object.values(occupancies).map(l2 =>
					Object.values(l2)
				);
				const occupanciesFlatList = Array.prototype.concat.apply(
					[],
					occupanciesListList
				);
				// Return it sorted:
				debug(occupanciesFlatList);
				return occupanciesFlatList.sort((a: any, b: any) =>
					a.room.name.localeCompare(b.room.name)
				);
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
