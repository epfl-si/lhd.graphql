import {booleanArg, extendType, list, objectType, stringArg} from 'nexus';
import { lab_has_hazards, hazard_form_history, hazard_form } from 'nexus-prisma';
import {HazardCategoryStruct} from "./hazardCategory";

export const HazardFormStruct = objectType({
	name: hazard_form.$name,
	description: `The list of hazards categories.`,

	definition(t) {
		t.nonNull.field(hazard_form.form);
		t.nonNull.field(hazard_form.version);
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

export const HazardFormQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.hazardForms({ filtering: true, ordering: true });
	},
});
