/**
 * GraphQL types and queries for Room's and RoomKind's
 */

import { objectType, extendType } from 'nexus'
import { Room, RoomKind } from 'nexus-prisma'

export const RoomType = objectType({
  name: Room.$name,
  definition(t) {
    for (const f of ["building", "sector", "floor", "roomNo", "kind"]) {
      t.field(Room[f])
    }
  }
})

export const RoomKindType = objectType({
  name: RoomKind.$name,
  definition(t) {
    t.field(RoomKind.name)
  }
})

export const RoomQuery = extendType({
  type: 'Query',
  definition(t) {
    t.crud.rooms({ filtering: true })
  },
})

export const RoomKindQuery = extendType({
  type: 'Query',
  definition(t) {
    t.crud.roomKinds({filtering: true})
  }
})
