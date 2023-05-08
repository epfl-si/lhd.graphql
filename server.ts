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
import * as cors from 'cors';

import { schema } from './nexus/schema';

import { Issuer, errors } from 'openid-client';
import { UserInfo, loginResponse } from './serverTypes';

type TestInjections = {
	insecure?: boolean;
	onQuery?: (q: Prisma.QueryEvent) => void;
};

export async function makeServer(
	config: BackendConfig,
	{ insecure, onQuery }: TestInjections = {}
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
	app.use(cors());
	if (! insecure) {
		app.use(async function (req, res, next) {
			try {
				var loginResponse = await isLoggedIn(req);
				if (req.method === 'POST' && !isHarmless(req) && !loginResponse.loggedIn) {
					res.status(loginResponse.httpCode);
					res.send(loginResponse.message);
				} else {
					next();
				}
			} catch (e) {
				res.status(500);
				res.send(`GraphQL Error: ${e}`);
			}
		});
	}
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

let _issuer: Issuer | undefined = undefined;

async function issuer() {
	if (_issuer) return _issuer;

	_issuer = await Issuer.discover(
		process.env.OIDC_BASE_URL || 'http://localhost:8080/realms/LHD'
	);

	return _issuer;
}

async function isLoggedIn(req): Promise<loginResponse> {
	async function verifyToken(access_token: string) {
		const issuer_ = await issuer();
		const client = new issuer_.Client({ client_id: 'LHDv3 server' });

		try {
			const userinfo: UserInfo = await client.userinfo(access_token);
			const allowedGroups = process.env.ALLOWED_GROUPS.split(',');
			console.log('Logged in', userinfo);
			console.log('Allowed groups', allowedGroups);
			// TODO: Some pages do not have the same access rights as others. Rewrite this to account for that.
			if (userinfo.groups && userinfo.groups.some(e => allowedGroups.includes(e))) {
				return {
					loggedIn: true,
					httpCode: 200,
					message: 'Correct access rights and token are working, user logged in.',
				};
			}
			return {
				loggedIn: false,
				httpCode: 403,
				message: `Wrong access rights. You are required to have one of the following groups: ${allowedGroups.join(
					', '
				)}`,
			};
		} catch (e: any) {
			if (e instanceof errors.OPError && e.error == 'invalid_token') {
				return {
					loggedIn: false,
					httpCode: 401,
					message: `JWT Token is invalid: ${e}`,
				};
			} else {
				throw e;
			}
		}
	}

	const matched = req.headers.authorization?.match(/^Bearer\s(.*)$/);

	if (!matched) {
		return undefined;
	}

	return await verifyToken(matched[1]);
}
