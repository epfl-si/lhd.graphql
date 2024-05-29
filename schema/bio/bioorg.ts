import {extendType, objectType} from 'nexus';
import { bio_org } from 'nexus-prisma';

export const BioOrgStruct = objectType({
	name: bio_org.$name,
	description: `Biological entity.`,
	definition(t) {
		t.field(bio_org.organism);
		t.field(bio_org.risk_group);
		t.field('fileLink', {
			type: "String",
			resolve(bio) {
				return 'https://lhd.epfl.ch/hazards/bio/lhd_bio_file.php?id=' + bio.id_bio_org;
			},
		});
	},
});

export const BioOrgQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.bioOrgs({ filtering: true });
	},
});
