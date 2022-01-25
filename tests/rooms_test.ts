import 'mocha'
import * as assert from 'assert'
import { Prisma } from '@prisma/client'

import { GraphQLClient, asGraphQL, useTestServer } from './testlib/graphql'

type Room = {
  name: string
  site: string
  catalyseType : string | null
  building: string
  floor: string
  sector: string
  roomNo: string
  kind? : { name: string | null }
}

describe("End-to-end tests", () => {
  const queries : Array<Prisma.QueryEvent> = []
  function onQuery(q) {
    queries.push(q)
  }
  afterEach(() => queries.splice(0, queries.length))

  let client = useTestServer<Room>({ before, after, onQuery })
  function q(params: QueryParams, queryMore?: string) { return queryRooms(client(), params, queryMore) }

  it("serves", async function() {
    this.timeout(10000)
    const rooms = await q({})
    assert(rooms.length > 9)
  })

  describe("`room` type and queries", () => {
    it("has all the fields", async () => {
      const svRooms = await q({building: { equals: "SV"}})
      for (const room of svRooms) {
        const roomJSON = JSON.stringify(room)
        assert(room.name,                `bad name: ${roomJSON}`)
        assert(room.site,                `bad site: ${roomJSON}`)
        assert(room.building,            `bad building: ${roomJSON}`)
        assert(room.sector != undefined, `bad sector: ${roomJSON}`)
        assert(room.floor != undefined,  `bad floor: ${roomJSON}`)
        assert(room.roomNo,              `bad roomNo: ${roomJSON}`)
      }
      assert(svRooms.some((r) => !! r.catalyseType))
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

    describe("joins", () => {
      it("joins for searches", async () => {
        const svRooms = await q({building: { equals: "SV"}})
        const svRoomsWithRadioactiveHazard = await q({ building: { equals: "SV"}, nirad: {some: {} }})
        assert(svRoomsWithRadioactiveHazard.length < svRooms.length)

        assert(queries.some((q) => q.query.includes(' JOIN ')))
      })

      it("joins (or pretends to) for object-valued fields", async () => {
        const svWashRooms = await q({
          building: { equals: "SV" },
          roomNo: { equals: "1522" }
        }, 'kind { name }')
        assert.equal(1, svWashRooms.length)
        assert.equal("Washing room", svWashRooms[0].kind.name)
      })

      it("doesn't make N+1 queries", async () => {
        const svRooms = await q({building: { equals: "SV"}}, 'kind { name }')
        assert(svRooms.length > 9)

        const kinds : { [id : string] : number } = {}
        for (const room of svRooms) {
          const k = room.kind?.name
          kinds[k] = kinds[k] ? kinds[k] + 1 : 1
        }
        const kindCount = Object.keys(kinds).length
        assert(kindCount > 5)

        assert(queries.length < kindCount)
        assert(queries.some((q) => q.query.includes(' IN (')))
      })
    })

    it("paginates")
  })

  describe('`roomKind` type and queries', () => {
    it('serves', async () => {
      const roomKinds = await client().query(`{ roomKinds { name }}`)
      assert(roomKinds.length > 9)
    })
  })
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

async function queryRooms(client : GraphQLClient<Room>, params: QueryParams, queryMore?: string) : Promise< Array<Room> > {
  if (! queryMore) queryMore = ''
  for (const k of ["building", "nirad", "sector", "floor", "roomNo"]) {
    if (typeof(params[k]) === "string") {
      params[k] = { "equals": params[k] }
    }
  }

  return client.query(`{ rooms (where : ${asGraphQL(params)}) {
        name
        catalyseType
        site
        building
        sector
        floor
        roomNo
        ${queryMore}
  } }`)
}
