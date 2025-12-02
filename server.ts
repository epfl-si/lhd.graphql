import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import * as fs from 'fs/promises'
import {schema} from './nexus/schema';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import * as path from "node:path";

import {schema} from './nexus/schema';
import {loginResponse, UserInfo} from './serverTypes';
import {Prisma} from '@prisma/client';
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from "@as-integrations/express5";
import {getPrismaForUser} from "./libs/auditablePrisma";
import {BackendConfig} from "./libs/config";
import {authenticateFromBarerToken} from "./libs/authentication";
import {makeRESTFilesAPI} from "./api/files";
import {formatErrorForNexus} from "./utils/errors";
import {makeRESTAPI} from "./api/catalyseSnow";

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

function parseJwt (access_token: string) {
    return JSON.parse(Buffer.from(access_token.split('.')[1], 'base64').toString());
}

async function checkTokenValid(access_token: string) {
	const client = jwksClient({
		jwksUri: process.env.OIDC_KEYS_URL,
	});

	const getKey = (header, callback) => {
		client.getSigningKey(header.kid, (err, key) => {
			if (err) return callback(err);
			const signingKey = key.getPublicKey();
			callback(null, signingKey);
		});
	}

	return new Promise((resolve,reject) =>
        jwt.verify(access_token, getKey, { 
			algorithms: ['RS256'], 
			issuer: process.env.OIDC_BASE_URL,
			audience: process.env.OIDC_CLIENT_ID
		},
        function(err,decoded) {
            return err ? reject(err) : resolve(decoded);
        }
    ));
}