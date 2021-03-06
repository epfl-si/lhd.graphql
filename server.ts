import { Prisma, PrismaClient } from '@prisma/client';
import { ApolloServer } from 'apollo-server';
import { PluginDefinition } from 'apollo-server-core';

import * as dotenv from 'dotenv';

import { schema } from './nexus/schema';

type TestInjections = {
	onQuery?: (q: Prisma.QueryEvent) => void;
};

export function makeServer(
	config: BackendConfig,
	{ onQuery }: TestInjections = {}
): ApolloServer {
	const onQueryParams: Prisma.PrismaClientOptions = {};
	if (onQuery) {
		onQueryParams.log = [{ level: 'query', emit: 'event' }];
	}

	// Found on https://github.com/prisma/prisma/issues/6088, and we really want Unix Sockets for security.
	const unixDomainSocketParams = {
		__internal: {
			useUds: true,
		},
	} as ConstructorParameters<typeof PrismaClient>[0];

	const prisma = new PrismaClient({
		datasources: { db: { url: config.LHD_DB_URL } },
		...unixDomainSocketParams,
		...onQueryParams,
	});

	if (onQuery) {
		(prisma as any).$on('query', onQuery);
	}

	return new ApolloServer({
		context: () => ({ prisma }),
		schema,
		plugins: [onServerStop(() => prisma.$disconnect())],
	});
}

type BackendConfig = {
	LHD_DB_URL: string;
};

export function configFromDotEnv(): BackendConfig {
	dotenv.config();
	return process.env as BackendConfig;
}

/**
 * An arbitrary stop-time callback, packaged as an ApolloServer plugin.
 */
function onServerStop(cb: () => Promise<void>): PluginDefinition {
	return {
		async serverWillStart() {
			return {
				serverWillStop: cb,
			};
		},
	};
}
