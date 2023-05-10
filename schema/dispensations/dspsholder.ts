import { PersonStruct } from './../roomdetails/people';
import { objectType } from 'nexus';
import { auth_dsps_holder } from 'nexus-prisma';

export const DispensationHolderStruct = objectType({
	name: auth_dsps_holder.$name,
	description: `Dispensation laboratory`,
	definition(t) {
		t.field(auth_dsps_holder.id_auth_dsps_holder);
		t.field('person', {
			type: PersonStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.person.findUnique({
					where: { id_person: parent.id_person },
				});
			},
		});
	},
});
