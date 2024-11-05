import {objectType} from 'nexus';
import { mutation_logs } from 'nexus-prisma';
import {Person} from "@prisma/client";

export const MutationLogsStruct = objectType({
	name: mutation_logs.$name,
	description: `Mutation logs struct`,
	definition(t) {
		t.field(mutation_logs.id_mutation_logs);
		t.field(mutation_logs.modified_by);
		t.field(mutation_logs.modified_on);
		t.field(mutation_logs.table_name);
		t.field(mutation_logs.table_id);
		t.field(mutation_logs.column_name);
		t.field(mutation_logs.old_value);
		t.field(mutation_logs.new_value);
		t.field(mutation_logs.action);
	},
});

export async function createNewMutationLog(
	tx: any,
	context: any,
	tableName: string,
	table_id: number,
	columnName: string,
	oldObject: object,
	newObject: object,
	action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LINK') {
	try {
		await tx.mutation_logs.create({
			data: {
				modified_by: context.user.preferred_username,
				modified_on: new Date(),
				table_name: tableName,
				table_id: table_id,
				column_name: columnName,
				old_value: oldObject ? JSON.stringify(oldObject) : null,
				new_value: JSON.stringify(newObject),
				action: action
			}
		});
	} catch ( e ) {
		console.log(e.message);
	}
}
