import {Prisma, PrismaClient} from "@prisma/client";
import {debug} from "debug";
import {BackendConfig} from "./config";

const basePrisma = new PrismaClient();

type TestInjections = {
	onQuery?: (q: Prisma.QueryEvent) => void;
};

export function getPrismaForUser(config: BackendConfig, user, inject?: TestInjections) {
	const clientOptions: Prisma.PrismaClientOptions = {};
	if (inject?.onQuery) {
		if (! clientOptions.log) clientOptions.log = [];
		clientOptions.log.push({ level: 'query', emit: 'event' });
	}
	if (debug.enabled('prisma:query')) {
		if (! clientOptions.log) clientOptions.log = [];
		clientOptions.log.push('query');
	}
	const prisma = basePrisma.$extends({
		query: {
			async $allOperations({ model, operation, args, query }) {
				let newValue = {};
				if (['create', 'update', 'delete', 'deleteMany'].includes(operation)) {
					const oldValue = operation === 'create' ? null : await basePrisma[model].findMany({ where: args.where });
					newValue = await query(args);
					try {
						const source = operation === "create" ? newValue : (operation == 'deleteMany' ? null : oldValue[0]);
						const key = source ? Object.keys(source).find(k => k.startsWith("id")) : undefined;
						const id = key ? source[key] : 0;
						await basePrisma['mutation_logs'].create({
							data: {
								modified_by: user.username,
								modified_on: new Date(),
								table_name: model,
								table_id: id,
								column_name: '',
								old_value: oldValue ? JSON.stringify(oldValue) : '',
								new_value: ['delete','deleteMany'].includes(operation) ? '' : JSON.stringify(newValue),
								action: operation.toUpperCase()
							}
						});
					} catch ( e ) {
						console.log(`Log not in the DB ${e.message}`);
					}
				} else {
					newValue = await query(args);
				}
				return newValue;
			},
		},
		datasources: { db: { url: config.LHD_DB_URL } },
		...clientOptions,
	});

	if (inject?.onQuery) {
		(prisma as any).$on('query', inject?.onQuery);
	}
	return prisma;
}
