import { PrismaClient } from '@prisma/client'
import { ApolloServer } from 'apollo-server'
import { PluginDefinition } from 'apollo-server-core'

import * as dotenv from 'dotenv'

import { schema } from './nexus/schema'

export function makeServer(config: BackendConfig) : ApolloServer {
  const prisma = new PrismaClient({datasources: {db: {url: config.LHD_DB_URL}}})

  return new ApolloServer({
    context: () => ({ prisma }),
    schema,
    plugins: [
      onServerStop(() => prisma.$disconnect())
    ]
  })
}

type BackendConfig = {
  LHD_DB_URL: string
}

export function configFromDotEnv() : BackendConfig {
  dotenv.config()
  return process.env as BackendConfig
}

/**
 * An arbitrary stop-time callback, packaged as an ApolloServer plugin.
 */
function onServerStop(cb: () => Promise<void>): PluginDefinition {
  return {
    async serverWillStart() {
      return {
        serverWillStop: cb
      }
    }
  }
}
