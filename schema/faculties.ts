import { extendType, objectType } from 'nexus';
import { faculty } from 'nexus-prisma';

export const FacultyStruct = objectType({
	name: faculty.$name,
	definition(t) {
		t.field(faculty.name_faculty);
	},
});

// export const UnitQuery = extendType({
// 	type: 'Query',
// 	definition(t) {
// 		t.crud.units({ filtering: true });
// 	},
// 	// TODO: filter out person with person ID 158 (“Not Available”)
// });
