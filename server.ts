import {Prisma} from '@prisma/client';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import * as fs from 'fs/promises'
import {schema} from './nexus/schema';
import * as path from "node:path";
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from "@as-integrations/express5";
import {makeRESTAPI} from "./api/authorizations";
import {formatErrorForNexus} from "./utils/GraphQLErrors";
import {getPrismaForUser} from "./libs/auditablePrisma";
import {BackendConfig, configFromDotEnv} from "./libs/config";
import {getFilePathFromResource} from "./utils/File";
import {authenticateFromBarerToken} from "./libs/authentication";
import {makeRESTFilesAPI} from "./api/files";

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
			const {errorCode, errorMessage} = formatErrorForNexus(formattedError, error);
			return {extensions: {code: errorCode}, message: errorMessage};
		},
		plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
	});

	await server.start();

	app.use(express.json({ limit: '50mb' }));
	app.use(cors());

	async function authenticate(req) {
		if ( insecure || isHarmless(req) ) return;
		return await authenticateFromBarerToken(req);
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
	app.use("/files", makeRESTFilesAPI());

	return httpServer;
}

/**
 * Whether the request is a harmless POST query.
 *
 * `IntrospectionQuery` GraphQL requests are presumed harmless;
 * everything else returns `false`.
 */
function isHarmless(req: express.Request): boolean {
	const query = (req?.body?.query || '').trim();
	return req.method === 'POST' &&
		req.url.startsWith("/graphql") &&
		query.startsWith('query IntrospectionQuery');
}
