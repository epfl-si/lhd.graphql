/**
 * GraphQL types and queries for Room's
 */

import { objectType, extendType } from 'nexus'
import { Room } from 'nexus-prisma'

export const RoomType = objectType({
  name: Room.$name,
  definition(t) {
    for (const f of ["building", "sector", "floor", "roomNo"]) {
      t.field(Room[f])
    }
  }
})

export const RoomQuery = extendType({
  type: 'Query',
  definition(t) {
    t.crud.rooms({ filtering: true })
  },
})
