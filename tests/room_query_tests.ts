import 'mocha'
import * as assert from 'assert'
import { Prisma } from '@prisma/client'

import {
  makeServer,
  configFromDotEnv  // Hermetic tests for a brown-field DB are hard mmkay
} from '../server'
import { graphqlClient, GraphQLClient } from './testlib/graphql'

type Room = {
  building: string
  floor: string
  sector: string
  roomNo: string
}

describe("`rooms` query", () => {
  let server : ReturnType<typeof makeServer>
  let port: number
  let client : GraphQLClient<Room>
  function q(params: QueryParams) { return queryRooms(client, params) }

  const queries : Array<Prisma.QueryEvent> = []
  function onQuery(q) {
    queries.push(q)
  }
  afterEach(() => queries.splice(0, queries.length))

  before(async () => {
    server = makeServer(configFromDotEnv(), { onQuery })
    const serverInfo = await server.listen(0)
    port = serverInfo.port as number
    console.log(`Test server listening on port ${port}`)
    client = graphqlClient(port)
  })
  after(async () => {
    await server.stop()
  })

  it("serves", async () => {
    const rooms = await q({})
    assert(rooms.length > 9)

    for (const room of rooms) {
      const roomJSON = JSON.stringify(room)
      assert(room.building,            `bad building: ${roomJSON}`)
      assert(room.sector != undefined, `bad sector: ${roomJSON}`)
      assert(room.floor != undefined,  `bad floor: ${roomJSON}`)
      assert(room.roomNo,              `bad roomNo: ${roomJSON}`)
    }
  })

  describe("filtering", () => {
    it("filters by building", async () => {
      let rooms : Array<Room> = await q({building: "BC"})
      assert(rooms.length > 1)
      assert(rooms.length < 10)
      rooms = await q({building: "ZZ"})
      assert.equal(0, rooms.length)

      assert(queries.some((q) => q.query.includes(' WHERE ')))
      assert(! queries.some((q) => q.query.includes(' JOIN ')))
      assert(! queries.some((q) => q.query.includes(' AND ')))
    })

    it("filters by building `AND` floor", async () => {
      const rooms : Array<Room> = await q({building: "BC", floor: "3"})
      assert(rooms.length >= 1)
      assert(rooms.length < 5)

      assert(queries.some((q) => q.query.includes(' WHERE ')))
      assert(queries.some((q) => q.query.includes(' AND ')))
    })

    it("filters by sector", async () => {
      let rooms : Array<Room> = await q({sector: "K"})
      assert(rooms.length > 1)
      rooms = await q({sector: "Z"})
      assert.equal(0, rooms.length)
    })

    it("filters by floor", async () => {
      let rooms : Array<Room> = await q({floor: "-2"})
      assert(rooms.length >= 1)
      rooms = await q({floor: "-10"})
      assert.equal(0, rooms.length)
    })

    it("filters by roomNo", async () => {
      let rooms : Array<Room> = await q({roomNo: "487.1"})
      assert(rooms.length >= 1)
      assert(rooms.length < 5)
      rooms = await q({roomNo: "ZZZ"})
      assert.equal(0, rooms.length)
    })
  })

  it("joins", async () => {
    const svRooms = await q({building: { equals: "SV"}})
    const svRoomsWithRadioactiveHazard = await q({ building: { equals: "SV"}, nirad: {some: {} }})
    assert(svRoomsWithRadioactiveHazard.length < svRooms.length)

    assert(queries.some((q) => q.query.includes(' JOIN ')))
  })

  it("paginates")
})

// Please keep these “artisanal”; don't import auto-generated types
// (and risk false negatives for no benefits in coverage, as far as
// “our” code is concerned)
type QueryStringField = string | { equals: string }
type QueryJoinField = { some ?: any }

type QueryParams = {
  building ?: QueryStringField,
  sector   ?: QueryStringField,
  floor    ?: QueryStringField,
  roomNo   ?: QueryStringField,
  nirad    ?: QueryJoinField
}

async function queryRooms(client : GraphQLClient<Room>, params: QueryParams) : Promise< Array<Room> > {
  for (const k of ["building", "nirad", "sector", "floor", "roomNo"]) {
    if (typeof(params[k]) === "string") {
      params[k] = { "equals": params[k] }
    }
  }

  return client.query(`{ rooms (where : ${asGraphQL(params)}) {
        building
        sector
        floor
        roomNo
  } }`)
}

function asGraphQL (whereClause : any) {
  return JSON.stringify(whereClause).replace(/"([^"]*)":/g, (_match, $1) => $1+ ": ")
}
