import {objectType} from "nexus";
import {AssessmentDecisionHasFile} from "nexus-prisma";

export const FileANDStruct = objectType({
	name: AssessmentDecisionHasFile.$name,
	description: `File assessment and decision entity.`,
	definition(t) {
		t.field(AssessmentDecisionHasFile.file_path);
	},
});
