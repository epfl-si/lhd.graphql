import {Prisma} from '@prisma/client';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import * as fs from 'fs/promises'
import {schema} from './nexus/schema';

import {Issuer} from 'openid-client';
import {UserInfo} from './serverTypes';
import * as path from "node:path";
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from "@as-integrations/express5";
import {getBearerToken} from "./libs/authentication";
import {makeRESTAPI} from "./api/authorizations";
import {getFormattedError} from "./utils/GraphQLErrors";
import {getPrismaForUser} from "./libs/auditablePrisma";
import {BackendConfig, configFromDotEnv} from "./libs/config";
import {getFilePathFromResource} from "./utils/File";

type TestInjections = {
	insecure?: boolean;
	onQuery?: (q: Prisma.QueryEvent) => void;
};

export async function makeServer(
	config: BackendConfig,
	{ insecure, onQuery }: TestInjections = {}
) {
	const app = express();
	const httpServer = http.createServer(app);

	interface Context {
		prisma: any;
		user: any;
	}

	const server = new ApolloServer<Context>({
		schema,
		formatError(formattedError, error: any) {
			console.error('Server error:', error, error.originalError);
			const {errorCode, errorMessage} = getFormattedError(formattedError, error);
			return {extensions: {code: errorCode}, message: errorMessage};
		},
		plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
	});

	await server.start();

	app.use(express.json({ limit: '50mb' }));
	app.use(cors());

	async function authenticate(req) {
		const user = await getLoggedInUser(req);
		if (!insecure) {
			if ( req.method === 'POST' && !isHarmless(req) && !user ) {
				throw new Error('Unauthorized');
			}
		}
		return user;
	}

	app.get('/graphiql', async (req, res) => {
		const html =  await fs.readFile('developer/graphiql.html', 'utf8')
		res.send(html)
	})

	app.post('/files/', async (req, res) => {
		console.log('Getting file');
		const prisma = getPrismaForUser(configFromDotEnv(), req.user);
		const filePath = await getFilePathFromResource(prisma, req.body);
		const fileName = path.basename(filePath);
		const fullFilePath = path.join(process.env.DOCUMENTS_PATH, filePath);
		console.log('Getting file', fullFilePath);
		res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
		res.sendFile(fullFilePath, (err) => {
			if ( err ) {
				console.error('Error sending file:', err);
				res.status(500).send(err.message);
			} else {
				console.log('Getting file success', fullFilePath);
			}
		});
	});


	app.use('/graphql',
		expressMiddleware(server, {
			context: async ( { req } ) => {
				const user = await authenticate(req);
				const prisma = getPrismaForUser(config, user, {onQuery});
				return { prisma, user };
			}
		})
	);

	app.use("/api", makeRESTAPI());

	return httpServer;
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

async function getLoggedInUser(req): Promise<object> {
	async function getUserAuthentication(access_token: string) {
		const issuer_ = await issuer();
		const client = new issuer_.Client({ client_id: 'LHDv3 server' });

		const user: UserInfo = await client.userinfo(access_token);
		const allowedGroups = process.env.ALLOWED_GROUPS.split(',');
		console.log('Logged in', user);
		console.log('Allowed groups', allowedGroups);

		if (!(user.groups && user.groups.some(e => allowedGroups.includes(e)))) {
			throw new Error('Wrong access rights');
		}

		if (!user.username)
			user.username = user.preferred_username;

		const hasRoleAdmin = user.groups.indexOf(process.env.ADMIN_GROUP) > -1;
		const hasRoleManager = user.groups.indexOf(process.env.LHD_GROUP) > -1;
		const hasRoleManagerOrAdmin = hasRoleAdmin || hasRoleManager;
		const hasRoleCosec = user.groups.indexOf(process.env.COSEC_GROUP) > -1;

		user.isAdmin = hasRoleAdmin;
		user.isManager = hasRoleManager;
		user.isCosec = hasRoleCosec;

		user.canListRooms =
			user.canEditRooms =
			user.canListHazards =
			user.canEditHazards =
			user.canListUnits =
			user.canEditUnits =
			user.canListReportFiles =
			user.canListChemicals =
			user.canEditChemicals =
			user.canListAuthorizations =
			user.canEditAuthorizations =
			user.canListPersons =
			user.canEditOrganisms = hasRoleManagerOrAdmin;
		user.canListOrganisms = hasRoleManagerOrAdmin || hasRoleCosec;

		return user;
	}

	const matched = getBearerToken(req);
	if (!matched) {
		return undefined;
	}
	return await getUserAuthentication(matched);
}
