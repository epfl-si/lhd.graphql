import {objectType} from 'nexus';
import {lab_has_hazards_additional_info} from 'nexus-prisma';
import {HazardCategoryStruct} from "./hazardCategory";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {HazardsAdditionalInfoHasTagStruct} from "./hazardAdditionalInfoHasTag";

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
		t.string('id', {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_lab_has_hazards_additional_info, obj: getLabHasHazardsAdditionalInfoToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});

		t.nonNull.list.nonNull.field('hazardsAdditionalInfoHasTag', {
			type: HazardsAdditionalInfoHasTagStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazards_additional_info_has_tag.findMany({
					where: { id_lab_has_hazards_additional_info: parent.id_lab_has_hazards_additional_info }
				});
			},
		});
	},
});

export function getLabHasHazardsAdditionalInfoToString(parent) {
	return {
		id_lab_has_hazards_additional_info: parent.id_lab_has_hazards_additional_info,
		id_lab: parent.id_lab,
		id_hazard_category: parent.id_hazard_category,
		comment: parent.comment,
		filePath: parent.filePath,
		modified_by: parent.modified_by,
		modified_on: parent.modified_on
	};
}
