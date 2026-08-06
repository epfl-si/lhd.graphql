import {objectType} from "nexus";
import {HazardsAdditionalInfoHasFile} from "nexus-prisma";

export const FileAdditionalInfoStruct = objectType({
	name: HazardsAdditionalInfoHasFile.$name,
	description: `File assessment and decision entity.`,
	definition(t) {
		t.field(HazardsAdditionalInfoHasFile.file_path);
	},
});
