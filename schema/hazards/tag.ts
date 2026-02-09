import {extendType, objectType} from 'nexus';
import {Tag} from 'nexus-prisma';

export const TagStruct = objectType({
	name: Tag.$name,
	description: `The list of tags for hazards in rooms.`,

	definition(t) {
		t.nonNull.field(Tag.tag_name);
	},
});

export const TagQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.tags({ filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.canListHazards,
			resolve: async (root, args, context, info, originalResolve) => {
				// After user authorization, is he's authorized, call the original resolve
				return originalResolve(root, args, context, info);
			} });
	},
});
