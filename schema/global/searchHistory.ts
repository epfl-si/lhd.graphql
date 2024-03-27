import {extendType, intArg, objectType, stringArg} from 'nexus';
import {search_history} from 'nexus-prisma';
import {mutationStatusType} from "../statuses";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";

export const SearchHistoryStruct = objectType({
	name: search_history.$name,
	description: `The list of saved searches per page and user.`,

	definition(t) {
		t.nonNull.field(search_history.sciper);
		t.nonNull.field(search_history.search);
		t.nonNull.field(search_history.page);
	},
});

export const SearchHistoryQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.searchHistories({ filtering: true, ordering: true });
	},
});

const searchHistoryChangesType = {
	sciper: intArg(),
	page: stringArg(),
	search: stringArg()
};

export const SearchHistoryStatus = mutationStatusType({
	name: "SearchHistoryStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the user's search.`});
	}
});

export const SearchHistoryMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('createNewSearchForUser', {
			description: `Create new user's search.`,
			args: searchHistoryChangesType,
			type: "SearchHistoryStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						const history = await tx.search_history.findFirst({where: {sciper: args.sciper, page: args.page}});
						if (history) {
							const newHistory = await tx.search_history.update(
								{ where: { unique_search_for_user_per_page: { sciper: args.sciper, page: args.page } },
									data: {
										sciper: args.sciper,
										page: args.page,
										search: args.search
									}
								});

							if ( !newHistory ) {
								throw new Error(`history not updated for user ${args.sciper}.`);
							}
						} else {
							const newHistory = await tx.search_history.create(
							{ data: {
									sciper: args.sciper,
									search: args.search,
									page: args.page
								}
							});

							if ( !newHistory ) {
								throw new Error(`history not created for user ${args.sciper}.`);
							}
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
	}
});
