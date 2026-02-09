import {objectType} from "nexus";
import {DispensationHasTicket} from "nexus-prisma";

export const TicketStruct = objectType({
	name: DispensationHasTicket.$name,
	description: `Ticket dispensation entity.`,
	definition(t) {
		t.field(DispensationHasTicket.ticket_number);
	},
});
