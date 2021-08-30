/**
 * Poor man's GraphQL client
 *
 * As per https://graphql.org/graphql-js/graphql-clients/ ,
 * GraphQL can be queried with a simple REST-style API.
 */

import fetch from 'node-fetch'
import * as debug_ from 'debug'

const debug = debug_('lhd-tests:graphql')

export interface GraphQLClient<TRecord> {
  query(query: string) : Promise< Array<TRecord> >
}

export function graphqlClient<TRecord>(port: number) : GraphQLClient<TRecord> {
  return {
    async query(query: string) : Promise< Array<TRecord> > {
      const fetched = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      })
      const json = await fetched.json()
      debug(json)
      for (const k in json.data) {
        // In fact, we expect json.data to contain exactly one key
        // (e.g. “rooms” for a `{ rooms { } }` query):
        return json.data[k]
      }
      return []  // Not reached
    }
  }
}
