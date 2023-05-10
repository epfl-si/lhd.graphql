import { objectType } from 'nexus';
import { Institute } from 'nexus-prisma';
import { SchoolStruct } from './schools';

export const InstituteStruct = objectType({
	name: Institute.$name,
	description: `Second-level administrative division of EPFL.

An Institute is either a “real” institute of one of EPFL's schools or
colleges, or a similar division within a vice-presidency (e.g. a
domain like DSI). An Institute has-a School, and a School has-many
Institutes.`,
	definition(t) {
		t.field(Institute.id);
		t.field(Institute.name);
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
