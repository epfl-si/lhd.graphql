import { objectType } from 'nexus';
import { unit, subunpro } from 'nexus-prisma';
import { InstitutStruct } from './instituts';
import { SubunproStruct } from './subunpro';

export const UnitStruct = objectType({
	name: unit.$name,
	definition(t) {
		t.field(unit.name_unit);
		t.field(unit.sciper_unit);
		t.nonNull.field('institut', {
			type: InstitutStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.institut.findFirst({
					where: { id_institut: parent.id_institut },
				});
			},
		});
		t.nonNull.field('subunpro', {
			type: SubunproStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.subunpro.findFirst({
					where: { id_unit: (parent as any).id_unit },
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
