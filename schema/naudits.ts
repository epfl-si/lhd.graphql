import { objectType } from 'nexus';
import { naudits } from 'nexus-prisma';

export const NauditsStruct = objectType({
	name: naudits.$name,
	description: `Number of audits`,
	definition(t) {
		t.field(naudits.id_lab);
		t.field(naudits.naudits);
	},
});
