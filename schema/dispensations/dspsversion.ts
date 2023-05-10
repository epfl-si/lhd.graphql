import { objectType } from 'nexus';
import { auth_dsps_version } from 'nexus-prisma';
import { DispensationStruct } from './dsps';
import { DispensationHolderStruct } from './dspsholder';

export const DispensationVersionStruct = objectType({
	name: auth_dsps_version.$name,
	description: `Dispensation laboratory`,
	definition(t) {
		t.field(auth_dsps_version.subject);
		t.field(auth_dsps_version.date_end);
		t.field('dsps', {
			type: DispensationStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.auth_dsps.findUnique({
					where: { id_auth_dsps: parent.id_auth_dsps },
				});
			},
		});
		t.list.field('dsps_holder', {
			type: DispensationHolderStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.auth_dsps_holder.findMany({
					where: { id_auth_dsps_version: parent.id_auth_dsps_version },
				});
			},
		});
	},
});
