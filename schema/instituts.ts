import { objectType } from 'nexus';
import { institut } from 'nexus-prisma';
import { FacultyStruct } from './faculties';

export const InstitutStruct = objectType({
	name: institut.$name,
	definition(t) {
		t.field(institut.id_institut);
		t.field(institut.name_institut);
		t.nonNull.field('faculty', {
			type: FacultyStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.faculty.findUnique({
					where: { id_faculty: parent.id_faculty },
				});
			},
		});
	},
});
