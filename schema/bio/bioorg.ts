import { objectType } from 'nexus';
import { bio_org } from 'nexus-prisma';

export const BioOrgStruct = objectType({
	name: bio_org.$name,
	description: `Biological entity.`,
	definition(t) {
		t.field(bio_org.organism);
	},
});
