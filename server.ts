import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import * as fs from 'fs/promises'

import {schema} from './nexus/schema';
import {Prisma} from '@prisma/client';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from "@as-integrations/express5";
import {getPrismaForUser} from "./utils/auditablePrisma";
import {BackendConfig} from "./utils/config";
import {authenticateFromBearerToken} from "./utils/authentication";
import {makeRESTFilesAPI} from "./file/files";
import {formatErrorForNexus} from "./utils/errors";
import {makeRESTAPI} from "./api/catalyseSnow";
import {makeRESTAxsAPI} from "./api/axs";

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
		return await authenticateFromBearerToken(req);
	}

	app.get('/graphiql', async (req, res) => {
		let html =  await fs.readFile('developer/graphiql.html', 'utf8')
		html = html.replace("@@OIDC_BASE_URL@@", process.env.OIDC_BASE_URL)
		html = html.replace("@@REACT_CLIENT_ID@@", process.env.REACT_CLIENT_ID)
		res.send(html)
	})

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
	app.use("/axs", makeRESTAxsAPI());

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
