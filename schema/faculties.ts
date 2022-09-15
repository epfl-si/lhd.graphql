import { objectType } from 'nexus';
import { faculty } from 'nexus-prisma';

export const FacultyStruct = objectType({
	name: faculty.$name,
	description: `Top-level research or administrative division at EPFL.

A Faculty is either one of EPFL's schools or colleges, or an administrative
organizational unit of similar (top) rank, i.e. a vice-presidency.`,
	definition(t) {
		t.field(faculty.name_faculty);
	},
});
