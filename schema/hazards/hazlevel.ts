import { HazTypeStruct } from './haztype';
import { objectType } from 'nexus';
import { cad_lab } from 'nexus-prisma';

export const HazLevelStruct = objectType({
	name: cad_lab.$name,
	description: `Hazard levels struct`,
	definition(t) {
		t.field(cad_lab.id_haz);
		t.field(cad_lab.score);
		t.field('haz_type', {
			type: HazTypeStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.haz.findUnique({
					where: { id_haz: parent.id_haz },
				});
			},
		});
	},
});
