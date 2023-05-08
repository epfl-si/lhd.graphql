import 'mocha'
import * as assert from 'assert'
import { Prisma } from '@prisma/client'

import { GraphQLClient, asGraphQL, useTestServer } from './testlib/graphql'

// Please keep these “artisanal”; don't import auto-generated types
// (and risk false negatives for no benefits in coverage, as far as
// “our” code is concerned)
type Dispensation = {
  slug: string
  versions: [DispensationVersion]
}

type DispensationVersion = {
  author: string
  subject: string
  description: string
  comment: string
  status: "Active" | "Canceled" | "Expired" | "Pending"
  draft_status: "draft" | "final"

  date_start: Date
  date_end: Date
  date_created: Date
  date_modified: Date
  modified_by: string

  rooms: [Room]
  holders: [Person]
}

// Again, these are *not* meant to be the “real” types:
type Room = {
  name: string
}
type Person = {
  name: string
  surname: string
}

describe("End-to-end tests", () => {
  const queries : Array<Prisma.QueryEvent> = []
  function onQuery(q) {
    queries.push(q)
  }
  afterEach(() => queries.splice(0, queries.length))

  let client = useTestServer<Dispensation>({ before, after, onQuery })
  function q(params: {}, queryMore?: string) { return queryDispensations(client(), queryMore) }

  it("serves dispensations with versions", async function() {
    this.timeout(10000)
    const dispensations = await q({})
    assert(dispensations.length > 9)
  })

  describe("has all the right types", () => {
    it("has all the fields", async () => {
      const dispensations = await q({})
      let versionsCount = 0, dispensationsCount = 0;
      for (const dispensation of dispensations) {
        dispensationsCount++;
        const dispensationJSON = JSON.stringify(dispensation)
        assert(dispensation.slug,                `bad slug: ${dispensationJSON}`)
        for (const version of dispensation.versions) {
          versionsCount++;
          assert(version.author)
          assert(version.subject)
          assert(version.description)
          assert(version.comment)
          assert(["Active", "Canceled", "Expired", "Pending"].includes(version.status))
          assert(["draft", "final"].includes(version.draft_status))
          assert(version.modified_by)
        }

        assert(versionsCount > 0);
      }
      assert(dispensationsCount > 0);
    })

    it("has rooms")
    it("has holders")
  })
})

async function queryDispensations(client : GraphQLClient<Dispensation>, queryMore?: string) : Promise< Array<Dispensation> > {
  if (! queryMore) queryMore = ''
  for (const k of ["building", "nirad", "sector", "floor", "roomNo"]) {
    // if (typeof(params[k]) === "string") {
     //  params[k] = { "equals": params[k] }
    // }
  }

  return client.query(`{ dispensations {
        slug
        versions {
          author
          subject
          description
          comment
          status
          draft_status

          date_start
          date_end

          date_created
          date_modified

          modified_by
        }
        ${queryMore}
  } }`)
}
