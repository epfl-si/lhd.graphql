import {extendType, objectType} from 'nexus';
import { hazards_additional_info_has_tag } from 'nexus-prisma';
import {TagStruct} from "./tag";

export const HazardsAdditionalInfoHasTagStruct = objectType({
	name: hazards_additional_info_has_tag.$name,
	description: `The list of tags and comments for hazards in rooms.`,

	definition(t) {
		t.nonNull.field(hazards_additional_info_has_tag.comment);

		t.nonNull.list.nonNull.field('tag', {
			type: TagStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.tag.findMany({
					where: { id_tag: parent.id_tag }
				});
			},
		});
	},
});

export const HazardsAdditionalInfoHasTagQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.hazardsAdditionalInfoHasTags({ filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.isAdmin || context.user.canListHazards,
			resolve: async (root, args, context, info, originalResolve) => {
				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
	},
});
