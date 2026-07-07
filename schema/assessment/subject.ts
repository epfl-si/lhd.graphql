import {extendType, objectType} from 'nexus';
import {AssessmentDecisionSubject} from 'nexus-prisma';

export const SubjectANDStruct = objectType({
	name: AssessmentDecisionSubject.$name,
	description: `The list of assessment and decision subjects.`,

	definition(t) {
		t.nonNull.field(AssessmentDecisionSubject.subject);
	},
});

export const SubjectANDQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.assessmentDecisionSubjects({
			filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.canListAssessments,
			resolve: async (root, args, context, info, originalResolve) => {
				// After user authorization, is he's authorized, call the original resolve
				args.orderBy = { id_assessment_and_decision_subject: 'asc' } as any;
				return originalResolve(root, args, context, info);
			}
		});
	},
});
