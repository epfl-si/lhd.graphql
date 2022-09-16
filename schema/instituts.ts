import { objectType } from 'nexus';
import { institut } from 'nexus-prisma';
import { SchoolStruct } from './schools';

export const InstitutStruct = objectType({
	name: institut.$name,
	description: `Second-level administrative division of EPFL.

An Institut is an institute of one of EPFL's schools or colleges,
or a similar division within a vice-presidency (e.g. a domain like
DSI). An Institut has-a School, and a School has-many Instituts.`,
	definition(t) {
		t.field(institut.id_institut);
		t.field(institut.name_institut);
		t.nonNull.field('school', {
			type: SchoolStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.school.findUnique({
					where: { id: parent.id_school },
				});
			},
		});
	},
});
