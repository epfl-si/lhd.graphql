import {extendType, objectType} from 'nexus';
import {dispensation_subject} from 'nexus-prisma';

export const SubjectStruct = objectType({
	name: dispensation_subject.$name,
	description: `The list of dispensation subjects.`,

	definition(t) {
		t.nonNull.field(dispensation_subject.subject);
	},
});

export const SubjectQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.dispensationSubjects({	filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.canListDispensations,
			resolve: async (root, args, context, info, originalResolve) => {
				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
	},
});
