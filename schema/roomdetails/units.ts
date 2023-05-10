import { objectType } from 'nexus';
import { Unit } from 'nexus-prisma';
import { InstituteStruct } from './institutes';

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
	},
});
