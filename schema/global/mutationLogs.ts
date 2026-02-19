import {extendType, list, objectType, stringArg} from 'nexus';
import {mutation_logs} from 'nexus-prisma';
import {IDObfuscator} from "../../utils/IDObfuscator";
import {diffObjects} from "../../utils/jsonUtils";
import {dbNamesRegexp, validateId} from "../../api/lib/lhdValidators";
import {sanitizeNames} from "../../utils/fieldValidatePlugin";

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

export const MutationLogsQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.mutationLogs({	filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.isManager || context.user.isAdmin,
			resolve: async (root, args, context, info, originalResolve) => {
				// After user authorization, is he's authorized, call the original resolve
				return originalResolve(root, args, context, info);
			} });
	},
});

export const DiffEntry = objectType({
	name: 'DiffEntry',
	definition(t) {
		t.nonNull.string('field');
		t.nonNull.string('before');
		t.nonNull.string('after');
	},
});

export const FlatMutationType = objectType({
	name: "FlatMutationType",
	definition(t) {
		t.nonNull.string('modified_by');
		t.nonNull.string('modified_on');
		t.nonNull.list.nonNull.field('diffs', {
			type: 'DiffEntry',
		})
	}
})

export const MutationLogsByTable = extendType({
	type: 'Query',
	definition(t) {
		t.field("mutationLogsByTable", {
			type: list('FlatMutationType'),
			args: {
				tableName: stringArg(),
				tableIdentifier: stringArg(),
				excludedField: stringArg()
			},
			authorize: (parent, args, context) => context.user.canListDispensations,
			validate: {
				tableName: {function: sanitizeNames, validator: dbNamesRegexp},
				tableIdentifier: validateId,
				excludedField: {function: sanitizeNames, validator: dbNamesRegexp}
			},
			async resolve(parent, args, context) {
				if (args.tableName && args.tableIdentifier) {
					const id = IDObfuscator.getId(args.tableIdentifier);
					const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
					const logs = await context.prisma.mutation_logs.findMany({
						where: {
							table_name: { in: args.tableName },
							table_id: { equals: idDeobfuscated }
						},
						orderBy: [{ modified_on: 'desc' }]
					});
					const res = [];
					logs.forEach(log => {
						const newValue = log.new_value !== '' ? JSON.parse(log.new_value) : {};
						if (newValue.status !== 'Draft') {
							const oldValue = log.old_value !== '' ? JSON.parse(log.old_value)[0] : {};
							const diff = diffObjects(oldValue, newValue, [...args.excludedField]);
							if ( Object.keys(diff).length > 0 ) {
								res.push({
									modified_on: log.modified_on,
									modified_by: log.modified_by,
									diff: diff
								});
							}
						}
					});
					return await groupByModifiedOn(context.prisma, res);
				}
				return [];
			}
		});
	},
});

async function groupByModifiedOn(prisma, data) {
	const result = [];
	for (const entry of data) {
		const diffs = await Promise.all(Object.entries(entry.diff).map(
			async ([field, change]) => {
				if (field === 'id_dispensation_subject') {
					const oldSubject = change["before"] ? await prisma.DispensationSubject.findUnique({where: {id_dispensation_subject: Number(change["before"]) }}) : '';
					const newSubject = change["after"] ? await prisma.DispensationSubject.findUnique({where: {id_dispensation_subject: Number(change["after"]) }}) : '';
					return {
						field,
						before: oldSubject ? `${oldSubject.subject}` : '',
						after: newSubject ? `${newSubject.subject}` : ''
					}
				}
				else if (field === 'id_person') {
					const oldValue = change["before"] ? await prisma.person.findUnique({where: {id_person: Number(change["before"]) }}) : undefined;
					const newValue = change["after"] ? await prisma.person.findUnique({where: {id_person: Number(change["after"]) }}) : undefined;
					return {
						field,
						before: oldValue ? `${oldValue.name} ${oldValue.surname}` : '',
						after: newValue ? `${newValue.name} ${newValue.surname}` : ''
					}
				}
				else if (field === 'id_unit') {
					const oldValue = change["before"] ? await prisma.Unit.findUnique({where: {id: Number(change["before"]) }}) : undefined;
					const newValue = change["after"] ? await prisma.Unit.findUnique({where: {id: Number(change["after"]) }}) : undefined;
					return {
						field,
						before: oldValue ? oldValue.name : '',
						after: newValue ? newValue.name : ''
					}
				}
				else if (field === 'id_lab') {
					const oldValue = change["before"] ? await prisma.room.findUnique({where: {id: Number(change["before"]) }}) : undefined;
					const newValue = change["after"] ? await prisma.room.findUnique({where: {id: Number(change["after"]) }}) : undefined;
					return {
						field,
						before: oldValue ? `${oldValue.name}` : '',
						after: newValue ? `${newValue.name}` : ''
					}
				}
				else if (field === 'date_end') {
					return {
						field,
						before: change["before"] ? new Intl.DateTimeFormat('en-GB').format(new Date(change["before"])) : '',
						after: change["after"] ? new Intl.DateTimeFormat('en-GB').format(new Date(change["after"])) : '',
					}
				}
				else if (field === 'file_path') {
					return {
						field,
						before: change["before"] ? change["before"].split('/').pop() : '',
						after: change["after"] ? change["after"].split('/').pop() : '',
					}
				}
				return {
					field,
					before: !change["before"] || change["before"] === 'undefined' ? '' : change["before"],
					after: !change["after"] || change["after"] === 'undefined' ? '' : change["after"],
				}
			}
		));
		result.push({
			modified_on: new Intl.DateTimeFormat('en-GB', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			}).format(entry.modified_on),
			modified_by: entry.modified_by,
			diffs,
		});
	}
	const grouped: any[] = Object.values(
		result.reduce((acc, item) => {
			const key = `${item.modified_on}|${item.modified_by}`

			if (!acc[key]) {
				acc[key] = {
					modified_on: item.modified_on,
					modified_by: item.modified_by,
					diffs: [],
				}
			}

			acc[key].diffs.push(...item.diffs)

			return acc
		}, {} as Record<string, any>)
	)
	return grouped;
}
