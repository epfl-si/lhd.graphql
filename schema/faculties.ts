import { objectType } from 'nexus';
import { faculty } from 'nexus-prisma';

export const FacultyStruct = objectType({
	name: faculty.$name,
	definition(t) {
		t.field(faculty.name_faculty);
	},
});
