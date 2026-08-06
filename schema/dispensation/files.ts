import {objectType} from "nexus";
import {DispensationHasFile} from "nexus-prisma";

export const FileDispensationStruct = objectType({
	name: DispensationHasFile.$name,
	description: `File dispensation entity.`,
	definition(t) {
		t.field(DispensationHasFile.file_path);
	},
});
