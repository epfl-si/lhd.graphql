import { extendType, objectType } from 'nexus';
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
				//console.log(parent, _, context);
				console.log(Object.keys(parent), Object.keys(_), Object.keys(context));
				return await context.prisma.faculty.findFirst({
					where: { id_faculty: (parent as any).id_faculty },
				});
			},
		});
	},
});

// export const UnitQuery = extendType({
// 	type: 'Query',
// 	definition(t) {
// 		t.crud.units({ filtering: true });
// 	},
// 	// TODO: filter out person with person ID 158 (“Not Available”)
// });
