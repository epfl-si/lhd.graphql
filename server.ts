import {Prisma, PrismaClient} from '@prisma/client';
import {debug} from 'debug';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';

import * as dotenv from 'dotenv';
import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import * as fs from 'fs/promises'
import {schema} from './nexus/schema';

import {errors, Issuer} from 'openid-client';
import {loginResponse, UserInfo} from './serverTypes';
import * as path from "node:path";
import {registerLegacyApi} from "./api";
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from "@as-integrations/express5";

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
		if (! clientOptions.log) clientOptions.log = [];
		clientOptions.log.push({ level: 'query', emit: 'event' });
	}
       if (debug.enabled('prisma:query')) {
		if (! clientOptions.log) clientOptions.log = [];
		clientOptions.log.push('query');
	}

	const prisma = new PrismaClient({
		datasources: { db: { url: config.LHD_DB_URL } },
		...clientOptions,
	});

	if (onQuery) {
		(prisma as any).$on('query', onQuery);
	}

	const httpServer = http.createServer(app);

	interface Context {
		prisma: any;
		user: any;
	}

	const server = new ApolloServer<Context>({
		schema,
		plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
	});

	await server.start();

	app.use(express.json({ limit: '50mb' }));
	app.use(cors());
	registerLegacyApi(app);

	if (! insecure) {
		app.use(async function (req, res, next) {
			try {
				var loginResponse = await getLoggedInUserInfos(req);
				if (req.method === 'POST' && !isHarmless(req) && !loginResponse.loggedIn) {
					res.status(loginResponse.httpCode);
					res.send(loginResponse.message);
				} else {
					next();
				}
			} catch (e) {
				console.error(e, e.stack);
				res.status(500);
				res.send(`GraphQL Error: ${e}`);
			}
		});
	}

	app.get('/graphiql', async (req, res) => {
		const html =  await fs.readFile('developer/graphiql.html', 'utf8')
		res.send(html)
	})

	app.post('/files/', async (req, res) => {
		try {
			console.error('Getting file');
			var loginResponse = await getLoggedInUserInfos(req);
			if (!loginResponse.loggedIn) {
				res.status(loginResponse.httpCode);
				res.send(loginResponse.message);
			} else {
				const filePath = path.join(req.body.filePath as string);
				const fileName = path.basename(filePath);
				const fullFilePath = path.join(process.env.DOCUMENTS_PATH, filePath);
				console.error('Getting file', fullFilePath);
				res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
				res.sendFile(fullFilePath, (err) => {
					if ( err ) {
						console.error('Error sending file:', err);
						res.status(500).send(err.message);
					}
					console.error('Getting file success', fullFilePath);
				});
			}
		} catch ( e ) {
			console.error('Error sending file:', e);
			res.status(404).send('File not found');
		}
	});

	app.use('/',
		expressMiddleware(server, {
			context: async ({ req }) => ({ prisma, user: req.user  }),
		})
	);
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

async function getLoggedInUserInfos(req): Promise<loginResponse> {
	async function getUserAuthentication(access_token: string) {
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
					user: userinfo,
					httpCode: 200,
					message: 'Correct access rights and token are working, user logged in.',
				};
			}
			return {
				loggedIn: false,
				user: null,
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
		return {
			loggedIn: false,
			httpCode: 401,
			message: `No token, no logged in`,
		};
	}

	const authenticationResult = await getUserAuthentication(matched[1]);
	req.user = authenticationResult.user;
	return authenticationResult;
}
