import {extendType, objectType} from 'nexus';
import {tag} from 'nexus-prisma';

export const TagStruct = objectType({
	name: tag.$name,
	description: `The list of tags for hazards in rooms.`,

	definition(t) {
		t.nonNull.field(tag.tag_name);
	},
});

export const TagQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.tags({ filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.isAdmin || context.user.canListHazards,
			resolve: async (root, args, context, info, originalResolve) => {
				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
	},
});
