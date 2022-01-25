/**
 * Model for “occupancies,” an LHD-specific concept designating a part of
 * a Room that is dedicated to a given professor or responsible person.
 *
 * Rooms are a purely “land-based” concept; they are defined in
 * Archibus and given a unique identifier with letters and digits
 * (e.g. SV 1631). However, owing to “political” considerations, such
 * as the room being big enough for it, there might be more than one
 * person in charge (e.g. Professors) for any given room. The finest
 * possible unit of responsibilty is called an Occupancy; it has-a
 * Room, a responsible Person, and has-many COSECs (also Persons).
 */

import { objectType } from 'nexus'
import { RoomStruct } from './rooms'
import { PersonStruct } from './people'
import { labunpe } from 'nexus-prisma'

/**
 * The abstract Occupancy type.
 */
export const OccupancyStruct = objectType({
  name: "Occupancy",
  definition(t) {
    t.field("room", { type: RoomStruct })
    t.field("professor", { type: PersonStruct })
  }
})
