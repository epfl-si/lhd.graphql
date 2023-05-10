import { objectType } from 'nexus';
import { auth_dsps_lab, auth_dsps_version } from 'nexus-prisma';
import { DispensationVersionStruct } from './dspsversion';

export const DispensationLabStruct = objectType({
	name: auth_dsps_lab.$name,
	description: `Dispensation laboratory`,
	definition(t) {
		t.field(auth_dsps_lab.id_auth_dsps_lab);
		t.nonNull.list.field('dsps_version', {
			type: DispensationVersionStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.auth_dsps_version.findMany({
					where: { id_auth_dsps_version: parent.id_auth_dsps_version },
				});
			},
		});
	},
});
