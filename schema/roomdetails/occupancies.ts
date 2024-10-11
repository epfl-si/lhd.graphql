/**
 * Model for “occupancies,” an LHD-specific concept designating a part
 * of a Room for which a given professor and one or more cosecs are
 * accountable.
 */

import { objectType } from 'nexus';
import { RoomStruct } from '../global/rooms';
import { PersonStruct, nilPersonId } from '../global/people';
import { UnitStruct } from './units';
import { subunpro } from 'nexus-prisma';
import { Person } from '@prisma/client';

/**
 * The abstract Occupancy type.
 */
export const OccupancyStruct = objectType({
	name: 'Occupancy',
	description: `The smallest unit of accountability in a Room (LHD-specific concept).

Rooms are a purely “land-based” concept; they are defined in
Archibus and given a unique identifier with letters and digits
(e.g. SV 1631). However, owing to “political” considerations, such
as the room being big enough for it, there might be more than one
person in charge (e.g. Professors) for any given room. The finest
possible unit of responsibilty is called an Occupancy; it has-a
Room, a responsible Person, and has-many COSECs (also Persons).
`,
	definition(t) {
		// `room` and `unit` get resolved from the `occupancy` resolver in ./rooms.ts
		// (it being currently the only code path that can join to this objectType):
		t.field('room', {
			type: RoomStruct,
			description: `The Room that this Occupancy occupies.`,
		});
		t.field('unit', {
			type: UnitStruct,
			description: `The Unit that this Occupancy is for.`,
		});
		t.nonNull.list.nonNull.field('cosecs', {
			type: PersonStruct,
			description: `The security officers (“COrrespondants de SÉCurité”) for this Occupancy.`,
			async resolve(parent, _, context) {
				return [];
			},
		});
		t.nonNull.list.nonNull.field('professors', {
			type: PersonStruct,
			description: `The security officers (“COrrespondants de SÉCurité”) for this Occupancy.`,
			async resolve(parent, _, context) {
				const unit = await context.prisma.unit.findUnique({
					where: { id: parent.unit.id },
					// See previous comment regarding joining to person:
					include: { subunpro: { include: { person: true } } },
				});
				return sanitizePersonList<Person>(
					unit.subunpro.map((subunpro: subunpro) => subunpro.person)
				);
			},
		});
	},
});

function sanitizePersonList<
	T extends { id_person: number; name: string; surname: string }
>(persons: T[]) {
	return persons
		.filter(p => p.id_person !== nilPersonId)
		.sort((a: T, b: T) => {
			const compareSurame = a.surname.localeCompare(b.surname);
			if (compareSurame) return compareSurame;
			return a.name.localeCompare(b.name);
		});
}
