import { Prisma, PrismaClient } from '@prisma/client';
import { ApolloServer } from 'apollo-server-express';
import {
	PluginDefinition,
	ApolloServerPluginDrainHttpServer,
} from 'apollo-server-core';
import { debug } from 'debug';

import * as dotenv from 'dotenv';
import * as express from 'express';
import * as http from 'http';

import { schema } from './nexus/schema';

type TestInjections = {
	onQuery?: (q: Prisma.QueryEvent) => void;
};

export async function makeServer(
	config: BackendConfig,
	{ onQuery }: TestInjections = {}
) {
	const app = express();
	const clientOptions: Prisma.PrismaClientOptions = {};
	if (onQuery) {
		clientOptions.log = [{ level: 'query', emit: 'event' }];
	} else if (debug.enabled('prisma:query')) {
		clientOptions.log = ['query'];
	}

	const prisma = new PrismaClient({
		datasources: { db: { url: config.LHD_DB_URL } },
		...clientOptions,
	});

	if (onQuery) {
		(prisma as any).$on('query', onQuery);
	}

	const httpServer = http.createServer(app);

	const server = new ApolloServer({
		context: () => ({ prisma }),
		schema,
		plugins: [
			onServerStop(() => prisma.$disconnect()),
			ApolloServerPluginDrainHttpServer({ httpServer }),
		],
	});

	await server.start();

	app.use(express.json());
	app.use(function(req, res, next) {
		if (req.method === "POST" &&
		    ! isHarmless(req) &&
                    ! isLoggedIn(req)) {
			res.send('{"no": "way"}');
		} else {
			next();
		}
	});
	server.applyMiddleware({ path: "/", bodyParserConfig: false, app });

	return httpServer;
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

/**
 * Whether a POST query is harmless.
 *
 * `IntrospectionQuery` GraphQL requests are presumed harmless;
 * everything else returns `false`.
 */
function isHarmless(req : express.Request) : boolean {
	const query = (req?.body?.query || "").trim();
	return query.startsWith("query IntrospectionQuery");
}

function isLoggedIn (req) : boolean { return true; }
