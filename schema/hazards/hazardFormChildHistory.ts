import {objectType} from 'nexus';
import {hazard_form_child_history} from 'nexus-prisma';
import {HazardFormChildStruct} from "./hazardFormChild";

export const HazardFormChildHistoryStruct = objectType({
	name: hazard_form_child_history.$name,
	description: `The list of hazards form child history.`,

	definition(t) {
		t.nonNull.field(hazard_form_child_history.form);
		t.nonNull.field(hazard_form_child_history.version);
		t.nonNull.field('hazard_form_child', {
			type: HazardFormChildStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_form_child.findUnique({
					where: { id_hazard_form_child: parent.id_hazard_form_child}
				});
			},
		});
	},
});
