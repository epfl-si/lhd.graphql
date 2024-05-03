import { objectType } from 'nexus';
import { mutation_logs } from 'nexus-prisma';

export const MutationLogsStruct = objectType({
	name: mutation_logs.$name,
	description: `Mutation logs struct`,
	definition(t) {
		t.field(mutation_logs.id_mutation_logs);
		t.field(mutation_logs.modified_by);
		t.field(mutation_logs.modified_on);
		t.field(mutation_logs.table_name);
		t.field(mutation_logs.column_name);
		t.field(mutation_logs.old_value);
		t.field(mutation_logs.new_value);
		t.field(mutation_logs.action);
	},
});
