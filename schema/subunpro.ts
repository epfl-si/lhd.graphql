import { objectType } from 'nexus';
import { subunpro } from 'nexus-prisma';

export const SubunproStruct = objectType({
	name: subunpro.$name,
	definition(t) {
		t.field(subunpro.id_subunpro);
		t.field(subunpro.person);
	},
});

// export const UnitQuery = extendType({
// 	type: 'Query',
// 	definition(t) {
// 		t.crud.units({ filtering: true });
// 	},
// 	// TODO: filter out person with person ID 158 (“Not Available”)
// });
