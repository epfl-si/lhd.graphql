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

import { createRemoteJWKSet, jwtVerify, errors } from 'jose';

let jwks;
async function JWKS() {
	var fetchUrl = `${
		process.env.FETCH_URL
			? process.env.FETCH_URL
			: 'http://localhost:8080/realms/LHD'
	}/.well-known/openid-configuration`;
	console.log('fetchUrl', fetchUrl);
	if (!jwks) {
		const response = await fetch(fetchUrl);
		const { jwks_uri } = await response.json();
		jwks = createRemoteJWKSet(new URL(jwks_uri));
	}
	return jwks;
}

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
	app.use(async function (req, res, next) {
		try {
			if (req.method === 'POST' && !isHarmless(req) && !(await isLoggedIn(req))) {
				res.send('{"no": "way"}');
			} else {
				next();
			}
		} catch (e) {
			console.error('Authentication failed', e);
			res.send('{"i": "fckd up"}');
		}
	});
	server.applyMiddleware({ path: '/', bodyParserConfig: false, app });

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
function isHarmless(req: express.Request): boolean {
	const query = (req?.body?.query || '').trim();
	return query.startsWith('query IntrospectionQuery');
}

async function isLoggedIn(req): Promise<boolean> {
	async function verifyToken(token) {
		try {
			return await jwtVerify(token, await JWKS());
		} catch (e) {
			if (e instanceof errors.JWSInvalid || e instanceof errors.JWTExpired) {
				console.error(`Invalid or expired token: ${token}\n`, e);
				return undefined;
			} else {
				throw e;
			}
		}
	}

	const matched = req.headers.authorization?.match(/^Bearer\s(.*)$/);

	if (!matched) {
		return undefined;
	}

	return !!(await verifyToken(matched[1]));
}
