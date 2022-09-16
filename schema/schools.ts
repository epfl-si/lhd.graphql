import { objectType } from 'nexus';
import { School } from 'nexus-prisma';

export const SchoolStruct = objectType({
	name: School.$name,
	description: `Top-level research or administrative division at EPFL.

A School is either one of EPFL's schools or colleges, or an administrative
organizational unit of similar (top) rank, i.e. a vice-presidency.`,
	definition(t) {
		t.field(School.name);
	},
});
