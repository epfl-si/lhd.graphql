import {objectType} from "nexus";
import {authorization_has_radiation} from "nexus-prisma";

export const RadiationStruct = objectType({
	name: authorization_has_radiation.$name,
	description: `Radiation authorization entity.`,
	definition(t) {
		t.field(authorization_has_radiation.source);
	},
});
