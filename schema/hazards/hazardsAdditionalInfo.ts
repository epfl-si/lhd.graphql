import {objectType} from 'nexus';
import {lab_has_hazards, lab_has_hazards_additional_info, mutation_logs} from 'nexus-prisma';
import {HazardCategoryStruct} from "./hazardCategory";

export const HazardsAdditionalInfoStruct = objectType({
	name: lab_has_hazards_additional_info.$name,
	description: `The additonal info of an hazard in a room.`,

	definition(t) {
		t.field(lab_has_hazards_additional_info.comment);
		t.field(lab_has_hazards_additional_info.filePath);
		t.field(lab_has_hazards_additional_info.modified_by);
		t.field(lab_has_hazards_additional_info.modified_on);
		t.nonNull.field('hazard_category', {
			type: HazardCategoryStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_category.findUnique({
					where: { id_hazard_category: parent.id_hazard_category}
				});
			},
		});
	},
});
