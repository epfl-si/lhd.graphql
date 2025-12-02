import {Prisma} from '@prisma/client';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import * as fs from 'fs/promises'
import {schema} from './nexus/schema';

import {Issuer} from 'openid-client';
import {loginResponse, UserInfo} from './serverTypes';
import * as path from "node:path";
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from "@as-integrations/express5";
import {getBearerToken} from "./libs/authentication";
import {makeRESTAPI} from "./api/authorizations";
import {getFormattedError} from "./utils/GraphQLErrors";
import {getPrismaForUser} from "./libs/auditablePrisma";
import {BackendConfig, configFromDotEnv} from "./libs/config";
import {IDObfuscator} from "./utils/IDObfuscator";
import {getBioOrgToString} from "./schema/bio/bioorg";
import {getLabHasHazardChildToString} from "./schema/hazards/labHazardChild";
import {getLabHasHazardsAdditionalInfoToString} from "./schema/hazards/hazardsAdditionalInfo";
import {getUnitToString} from "./schema/roomdetails/units";

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
		var loginResponse = await getLoggedInUserInfos(req);
		if (!insecure) {
			if ( req.method === 'POST' && !isHarmless(req) && !loginResponse.user ) {
				throw new Error('Unauthorized');
			}
		}
		return loginResponse.user;
	}

	app.get('/graphiql', async (req, res) => {
		const html =  await fs.readFile('developer/graphiql.html', 'utf8')
		res.send(html)
	})

	app.post('/files/', async (req, res) => {
		console.log('Getting file');
		const prisma = getPrismaForUser(configFromDotEnv(), req.user);
		const id = path.join(req.body.id as string);
		const model = path.join(req.body.model as string);
		const fileNameFromArgs = path.join(req.body.fileName as string);
		const filePath = await prisma.$transaction(async (tx) => {

			switch (model) {
				case 'organism':
					const org = await IDObfuscator.ensureDBObjectIsTheSame(id,
						'bio_org', 'id_bio_org',
						prisma, 'organism', getBioOrgToString);
					return org.filePath;
				case 'organismByFormIO':
					const orgByFIO = await prisma.bio_org.findUnique({where: {id_bio_org: Number(id)}});
					if (orgByFIO) {
						return orgByFIO.filePath;
					}
					break;
				case 'labHasHazardsChild':
					const child = await IDObfuscator.ensureDBObjectIsTheSame(id,
						'lab_has_hazards_child', 'id_lab_has_hazards_child',
						prisma, 'hazard child', getLabHasHazardChildToString);
					const submission = JSON.parse(child.submission);
					return submission.data.fileLink;
				case 'hazardAdditionalInfo':
					const info = await IDObfuscator.ensureDBObjectIsTheSame(id,
						'lab_has_hazards_additional_info', 'id_lab_has_hazards_additional_info',
						prisma, 'hazard child', getLabHasHazardsAdditionalInfoToString);
					return info.filePath;
				case 'reportFile':
					const unit = await IDObfuscator.ensureDBObjectIsTheSame(id,
						'Unit', 'id',
						prisma, 'unit', getUnitToString);
					return `report_audits/pdf/${unit.id}/${fileNameFromArgs}`;
			}
			return '';
		});
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

	app.use(makeRESTAPI());

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

async function getLoggedInUserInfos(req): Promise<loginResponse> {
	async function getUserAuthentication(access_token: string) {
		const issuer_ = await issuer();
		const client = new issuer_.Client({ client_id: 'LHDv3 server' });

		const userinfo: UserInfo = await client.userinfo(access_token);
		const allowedGroups = process.env.ALLOWED_GROUPS.split(',');
		console.log('Logged in', userinfo);
		console.log('Allowed groups', allowedGroups);

		if (!(userinfo.groups && userinfo.groups.some(e => allowedGroups.includes(e)))) {
			throw new Error('Wrong access rights');
		}

		if (!userinfo.username)
			userinfo.username = userinfo.preferred_username;

		const hasRoleAdmin = userinfo.groups.indexOf(process.env.ADMIN_GROUP) > -1;
		const hasRoleManager = userinfo.groups.indexOf(process.env.LHD_GROUP) > -1;
		const hasRoleManagerOrAdmin = hasRoleAdmin || hasRoleManager;
		const hasRoleCosec = userinfo.groups.indexOf(process.env.COSEC_GROUP) > -1;

		userinfo.isAdmin = hasRoleAdmin;
		userinfo.isManager = hasRoleManager;
		userinfo.isCosec = hasRoleCosec;

		userinfo.canListRooms =
			userinfo.canEditRooms =
			userinfo.canListHazards =
			userinfo.canEditHazards =
			userinfo.canListUnits =
			userinfo.canEditUnits =
			userinfo.canListReportFiles =
			userinfo.canListChemicals =
			userinfo.canEditChemicals =
			userinfo.canListAuthorizations =
			userinfo.canEditAuthorizations =
			userinfo.canListPersons =
			userinfo.canEditOrganisms = hasRoleManagerOrAdmin;
		userinfo.canListOrganisms = hasRoleManagerOrAdmin || hasRoleCosec;

		return {
			user: userinfo,
			httpCode: 200,
			message: 'Correct access rights and token are working, user logged in.',
		};
	}

	const matched = getBearerToken(req);
	if (!matched) {
		return {
			user: undefined,
			httpCode: 401,
			message: `Unauthorized`
		};
	}
	return await getUserAuthentication(matched);
}
