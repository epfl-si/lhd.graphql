import { BioOrgStruct } from './bioorg';
import { objectType } from 'nexus';
import { bio_org_lab } from 'nexus-prisma';

export const BioOrgLabStruct = objectType({
	name: bio_org_lab.$name,
	description: `Biological entity.`,
	definition(t) {
		t.field(bio_org_lab.id_bio_org_lab);
		t.nonNull.field('bio_org', {
			type: BioOrgStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.bio_org.findUnique({
					where: { id_bio_org: parent.id_bio_org },
				});
			},
		});
	},
});
