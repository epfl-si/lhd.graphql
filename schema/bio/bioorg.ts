import {extendType, objectType} from 'nexus';
import { bio_org } from 'nexus-prisma';

export const BioOrgStruct = objectType({
	name: bio_org.$name,
	description: `Biological entity.`,
	definition(t) {
		t.field(bio_org.organism);
		t.field(bio_org.risk_group);
	},
});

export const BioOrgQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.bioOrgs({ filtering: true });
	},
});
