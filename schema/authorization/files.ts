import {objectType} from "nexus";
import {AuthorizationHasFile} from "nexus-prisma";

export const FileAuthorizationStruct = objectType({
	name: AuthorizationHasFile.$name,
	description: `File authorization entity.`,
	definition(t) {
		t.field(AuthorizationHasFile.file_path);
	},
});
