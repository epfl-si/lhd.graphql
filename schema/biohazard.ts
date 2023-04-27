import { BioOrgLabStruct } from './bioorglab';
import { objectType } from 'nexus';
import { bio } from 'nexus-prisma';

export const BioStruct = objectType({
	name: bio.$name,
	description: `Biological entity.`,
	definition(t) {
		t.field(bio.bio_level);
		t.field(bio.comment);
		t.field(bio.id_bio);
		t.nonNull.list.field('bio_org_lab', {
			type: BioOrgLabStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.bio_org_lab.findMany({
					where: { id_bio: parent.id_bio },
				});
			},
		});
	},
});
