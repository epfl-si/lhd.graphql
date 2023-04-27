import { objectType } from 'nexus';
import { haz } from 'nexus-prisma';

export const HazTypeStruct = objectType({
	name: haz.$name,
	description: `Hazard types struct.`,
	definition(t) {
		t.field(haz.haz_en);
	},
});
