import {objectType} from "nexus";
import {dispensation_has_ticket} from "nexus-prisma";

export const TicketStruct = objectType({
	name: dispensation_has_ticket.$name,
	description: `Ticket dispensation entity.`,
	definition(t) {
		t.field(dispensation_has_ticket.ticket_number);
	},
});
