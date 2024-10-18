import {booleanArg, extendType, list, objectType, stringArg} from 'nexus';
import { hazard_category } from 'nexus-prisma';

export const HazardCategoryStruct = objectType({
	name: hazard_category.$name,
	description: `The list of hazards categories.`,

	definition(t) {
		t.nonNull.field(hazard_category.hazard_category_name);
	},
});

export const HazardCategoryQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.hazardCategories({	filtering: true, ordering: true });
	},
});
