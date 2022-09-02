/**
 * Model for “occupancies,” an LHD-specific concept designating a part of
 * a Room that is dedicated to a given professor or responsible person.
 *
 * Rooms are a purely “land-based” concept; they are defined in
 * Archibus and given a unique identifier with letters and digits
 * (e.g. SV 1631). However, owing to “political” considerations, such
 * as the room being big enough for it, there might be more than one
 * person in charge (e.g. Professors) for any given room. The finest
 * possible unit of responsibilty is called an Occupancy; it has-a
 * Room, a responsible Person, and has-many COSECs (also Persons).
 */

import { objectType } from 'nexus';
import { RoomStruct } from './rooms';
import { PersonStruct, nilPersonId } from './people';
import { UnitStruct } from './unit';
import { subunpro } from 'nexus-prisma';
import { person, labunpe } from '@prisma/client';

/**
 * The abstract Occupancy type.
 */
export const OccupancyStruct = objectType({
	name: 'Occupancy',
	definition(t) {
		// `room` and `unit` get resolved from the `occupancy` resolver in ./rooms.ts
		// (it being currently the only code path that can join to this objectType):
		t.field('room', { type: RoomStruct });
		t.field('unit', { type: UnitStruct });
		t.nonNull.list.nonNull.field('cosecs', {
			type: PersonStruct,
			async resolve (parent, _, context) {
				// Despite TypeScript's opinion, we know that `parent.room.labunpe`
				// exists and is an array of labunpeStruct's, because we know (as per
				// comment above) that `parent` was made in ./rooms.ts:
				const labunpeStructs = (parent.room as any).labunpe as labunpe[];
				// ... But we need to make this SQL query anyway, so as to join
				// with cosecs (which ./rooms.ts doesn't do):
				const labunpes = await Promise.all(
					labunpeStructs.map((labunpe) =>
						context.prisma.labunpe.findUnique({
							where: { id_labunpe: labunpe.id_labunpe },
							// We could punt the cosec join into the
							// ./people.ts resolver, but that would
							// leave us unable to sort:
							include: { cosec : true } })));
				return sanitizePersonList(labunpes.map((labunpe) => labunpe.cosec));
			}
		});
		t.nonNull.list.nonNull.field('professors', {
			type: PersonStruct,
			async resolve (parent, _, context) {
				const unit = await context.prisma.unit.findUnique({
					where: { id_unit: parent.unit.id_unit },
					// See previous comment regarding joining to person:
					include: { subunpro: { include: { person : true } } } });
				return sanitizePersonList<person>(unit.subunpro.map((subunpro : subunpro) => subunpro.person));
			}
		});
	},
});

function sanitizePersonList<T extends { id_person: number, name: string, surname: string }> (persons : T[]) {
	return persons.filter((p) => (p.id_person !== nilPersonId))
		.sort((a: T, b: T) => {
			const compareSurame = a.surname.localeCompare(b.surname);
			if (compareSurame) return compareSurame;
			return a.name.localeCompare(b.name);
		});
}
