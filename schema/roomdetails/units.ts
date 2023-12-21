import { objectType } from 'nexus';
import { Unit } from 'nexus-prisma';
import { InstituteStruct } from './institutes';
import {PersonStruct} from "../global/people";
import {Person} from "@prisma/client";

export const UnitStruct = objectType({
	name: Unit.$name,
	description: `A lowest-rank organisational unit of EPFL.

Each EPFL lab (with exactly one Principal Investigator, or PI) is a Unit, as
is each lowest-level administrative division within central services.`,
	definition(t) {
		t.field(Unit.name);
		t.field({
			...Unit.unitId,
			description: `The unit's 5-digit primary identifier in EPFL's information system (units.epfl.ch)`,
		});
		t.nonNull.field('institute', {
			type: InstituteStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.institute.findUnique({
					where: { id: parent.id_institute },
				});
			},
		});
		t.nonNull.list.nonNull.field('cosecs', {
			type: PersonStruct,
			resolve: async (parent, _, context) => {
				const unitsAndCosecs = await context.prisma.unit_has_cosec.findMany({
					where: { id_unit: (parent as any).id }});
				const cosecIDs = new Set(unitsAndCosecs.map((unitAndCosec) => unitAndCosec.id_person));
				return await context.prisma.Person.findMany({
					where: { id_person: { in: [...cosecIDs] }}
				})
			},
		});
		t.nonNull.list.nonNull.field('professors', {
			type: PersonStruct,
			resolve: async (parent, _, context) => {
				const unitsAndProfessors = await context.prisma.subunpro.findMany({
					where: { id_unit: (parent as any).id }});
				const profIDs = new Set(unitsAndProfessors.map((unitsAndProfessor) => unitsAndProfessor.id_person));
				return await context.prisma.Person.findMany({
					where: { id_person: { in: [...profIDs] }}
				})
			},
		});
	},
});
