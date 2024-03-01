import {booleanArg, extendType, list, objectType, stringArg} from 'nexus';
import { lab_has_hazards, hazard_form_history, hazard_form } from 'nexus-prisma';
import {HazardCategoryStruct} from "./hazardCategory";
import {HazardFormStruct} from "./hazardForm";

export const HazardFormHistoryStruct = objectType({
	name: hazard_form_history.$name,
	description: `The list of hazards categories.`,

	definition(t) {
		t.nonNull.field(hazard_form_history.form);
		t.nonNull.field(hazard_form_history.version);
		t.nonNull.field('hazard_form', {
			type: HazardFormStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_form.findUnique({
					where: { id_hazard_form: parent.id_hazard_form},
					include: { hazard_category: true }
				});
			},
		});
	},
});
