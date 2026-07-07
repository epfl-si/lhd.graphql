import {objectType} from "nexus";
import {AssessmentDecisionHasTicket} from "nexus-prisma";

export const TicketANDStruct = objectType({
	name: AssessmentDecisionHasTicket.$name,
	description: `Ticket assessment and decision entity.`,
	definition(t) {
		t.field(AssessmentDecisionHasTicket.ticket_number);
	},
});
