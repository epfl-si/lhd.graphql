import { objectType } from 'nexus';
import { unit } from 'nexus-prisma';
import { InstitutStruct } from './instituts';

export const UnitStruct = objectType({
	name: unit.$name,
	definition(t) {
		t.field(unit.name_unit);
		t.field(unit.sciper_unit);
		t.nonNull.field('institut', {
			type: InstitutStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.institut.findUnique({
					where: { id_institut: parent.id_institut },
				});
			},
		});
	},
});
