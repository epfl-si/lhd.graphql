import { objectType } from 'nexus';
import { auth_dsps } from 'nexus-prisma';

export const DispensationStruct = objectType({
	name: auth_dsps.$name,
	description: `Dispensation`,
	definition(t) {
		t.field(auth_dsps.auth_dsps);
		t.field(auth_dsps.log_in);
	},
});
