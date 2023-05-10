/**
 * Poor man's GraphQL client
 *
 * As per https://graphql.org/graphql-js/graphql-clients/ ,
 * GraphQL can be queried with a simple REST-style API.
 */

import fetch from 'node-fetch';
import { debug as debug_ } from 'debug';
import {
	makeServer,
	configFromDotEnv, // Hermetic tests for a brown-field DB are hard mmkay
} from '../../server';
import { AddressInfo } from 'node:net';

import { HookFunction } from 'mocha';
import { Prisma } from '@prisma/client';

const debug = debug_('lhd-tests:graphql');

export interface GraphQLClient<TRecord> {
	query(query: string): Promise<Array<TRecord>>;
}

export function graphqlClient<TRecord>(port: number): GraphQLClient<TRecord> {
	return {
		async query(query: string): Promise<Array<TRecord>> {
			const fetched = await fetch(`http://localhost:${port}/graphql`, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ query }),
			});
			const json = await fetched.json();
			debug(json);
			for (const k in json.data) {
				// In fact, we expect json.data to contain exactly one key
				// (e.g. “rooms” for a `{ rooms { } }` query):
				return json.data[k];
			}
			return []; // Not reached
		},
	};
}

export function asGraphQL(whereClause: any) {
	return JSON.stringify(whereClause).replace(
		/"([^"]*)":/g,
		(_match, $1) => $1 + ': '
	);
}

export function useTestServer<TRecord>(opts: {
	before: HookFunction;
	after: HookFunction;
	onQuery?: (q: Prisma.QueryEvent) => void;
}): () => GraphQLClient<TRecord> {
	let port: number;
	let server: Awaited<ReturnType<typeof makeServer>>;

	let makeServerOpts = { insecure: true, onQuery: opts.onQuery }

	opts.before(async () => {
		server = await makeServer(configFromDotEnv(), makeServerOpts);
		await server.listen(0);
		port = (server.address() as AddressInfo).port;

		console.log(`Test server listening on port ${port}`);
	});
	opts.after(async () => {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
                });
	});
	return () => graphqlClient(port);
}
