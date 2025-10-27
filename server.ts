import {Prisma, PrismaClient} from '@prisma/client';
import {debug} from 'debug';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';

import * as dotenv from 'dotenv';
import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import * as fs from 'fs/promises'
import {schema} from './nexus/schema';

import {Issuer} from 'openid-client';
import {loginResponse, UserInfo} from './serverTypes';
import * as path from "node:path";
import {registerLegacyApi} from "./api";
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from "@as-integrations/express5";
import {getToken, VALID_TOKENS_FOR_API} from "./libs/authentication";

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

	const basePrisma = new PrismaClient();

	function getPrismaForUser(user) {
		return basePrisma.$extends({
			query: {
				async $allOperations({ model, operation, args, query }) {
					let newValue = {};
					if (['create', 'update', 'delete', 'deleteMany'].includes(operation)) {
						const oldValue = operation === 'create' ? null : await basePrisma[model.toLowerCase()].findMany({ where: args.where });
						newValue = await query(args);
						try {
							const source = operation === "create" ? newValue : (operation == 'deleteMany' ? null : oldValue[0]);
							const key = source ? Object.keys(source).find(k => k.startsWith("id")) : undefined;
							const id = key ? source[key] : 0;
							await basePrisma['mutation_logs'].create({
								data: {
									modified_by: user.preferred_username,
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
	}

	if (onQuery) {
		(basePrisma as any).$on('query', onQuery);
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

	if (! insecure) {
		app.use(async function (req: any, res, next) {
			try {
				var loginResponse = await getLoggedInUserInfos(req);
				req.user = loginResponse.user;

				if (req.method === 'POST' && !isHarmless(req) && !loginResponse.loggedIn) {
					res.status(loginResponse.httpCode);
					res.send(loginResponse.message);
				} else {
					next();
				}
			} catch (e) {
				console.error(e, e.stack);
				res.status(e.message == 'Unauthorized' ? 403 : 500);
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
		} catch ( e ) {
			console.error('Error sending file:', e);
			res.status(404).send('File not found');
		}
	});

	registerLegacyApi(app,{ prisma: getPrismaForUser({preferred_username: 'API'}) });

	app.use('/',
		expressMiddleware(server, {
			context: async ( { req } ) => {
				const user = req.user;
				const prisma = getPrismaForUser(user);
				return { prisma, user };
			}
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
			let userinfo: UserInfo;
			const apiUser = Object.keys(VALID_TOKENS_FOR_API).find(k => VALID_TOKENS_FOR_API[k] === access_token) || null;
			if (apiUser == null) {
				userinfo = await client.userinfo(access_token);
			} else {
				userinfo = {
					preferred_username: apiUser,
					groups:[]
				};
			}
			const allowedGroups = process.env.ALLOWED_GROUPS.split(',');
			console.log('Logged in', userinfo);
			console.log('Allowed groups', allowedGroups);
			if ((userinfo.groups && userinfo.groups.some(e => allowedGroups.includes(e)) || apiUser != null)) {
				userinfo.isAdmin = userinfo.groups.indexOf(process.env.ADMIN_GROUP) > -1;
				userinfo.isManager = userinfo.groups.indexOf(process.env.LHD_GROUP) > -1;
				userinfo.isCosec = userinfo.groups.indexOf(process.env.COSEC_GROUP) > -1;
				userinfo.canListRooms = userinfo.isAdmin || userinfo.isManager;
				userinfo.canEditRooms = userinfo.isAdmin || userinfo.isManager;
				userinfo.canListHazards = userinfo.isAdmin || userinfo.isManager;
				userinfo.canEditHazards = userinfo.isAdmin || userinfo.isManager;
				userinfo.canListUnits = userinfo.isAdmin || userinfo.isManager;
				userinfo.canEditUnits = userinfo.isAdmin || userinfo.isManager;
				userinfo.canListOrganisms = userinfo.isAdmin || userinfo.isManager || userinfo.isCosec;
				userinfo.canEditOrganisms = userinfo.isAdmin || userinfo.isManager;
				userinfo.canListChemicals = userinfo.isAdmin || userinfo.isManager;
				userinfo.canEditChemicals = userinfo.isAdmin || userinfo.isManager;
				userinfo.canListAuthorizations = userinfo.isAdmin || userinfo.isManager;
				userinfo.canEditAuthorizations = userinfo.isAdmin || userinfo.isManager;
				userinfo.canListPersons = userinfo.isAdmin || userinfo.isManager;
				userinfo.canCallAPIToGetChemicals = ['SNOW'].includes(userinfo.preferred_username);
				userinfo.canCallAPIToPostChemicals = ['SNOW'].includes(userinfo.preferred_username);
				userinfo.canCallAPIToPostAuthorization = ['SNOW'].includes(userinfo.preferred_username);
				userinfo.canCallAPIToRenewAuthorization = ['SNOW'].includes(userinfo.preferred_username);
				userinfo.canCallAPIToCheckAuthorization = ['CATALYSE'].includes(userinfo.preferred_username);

				return {
					loggedIn: true,
					user: userinfo,
					httpCode: 200,
					message: 'Correct access rights and token are working, user logged in.',
				};
			}
			throw new Error('Wrong access rights');
		} catch (e: any) {
			throw new Error('Unauthorized');
		}
	}

	const matched = getToken(req);
	if (!matched) {
		return {
			user: undefined,
			loggedIn: false,
			httpCode: 401,
			message: `Unauthorized`
		};
	}
	return await getUserAuthentication(matched);
}
