import 'mocha'
import { assert } from 'chai'
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

  it("serves dispensations", async function() {
    this.timeout(10000)
    const c = client()
    const dispensations = await (c.query(`{ dispensations { slug } }`))
    assert(dispensations.length > 20)
  })

  it("serves dispensations with versions", async function() {
    this.timeout(10000)
    const dispensations = await q({})
    assert(dispensations.length > 9)
  })

  describe("has all the right types", () => {
    it("has all the fields", async () => {
      const dispensations = await q({})
      let modifiedByCount = 0, dispensationsCount = 0;
      for (const dispensation of dispensations) {
        let versionsCount = 0;
        dispensationsCount++;
        const dispensationJSON = JSON.stringify(dispensation)
        assert(dispensation.slug,                `bad slug: ${dispensationJSON}`)
        for (const version of dispensation.versions) {
          const versionJSON = JSON.stringify(version);
          versionsCount++;
          assert(version.author,  `bad version: ${versionJSON}`)
          assert(version.subject,  `bad version: ${versionJSON}`)
          assert(version.description !== undefined)
          assert(version.comment !== undefined)
          assert(["Active", "Canceled", "Expired", "Pending"].includes(version.status))
          assert(["draft", "final"].includes(version.draft_status))
          if (version.modified_by) modifiedByCount++;
        }

        assert(versionsCount > 0);
      }
      assert(dispensationsCount > 0);
      assert(modifiedByCount > 0);
    })

    it("saves new dispensations", async function() {
      this.timeout(10000);
      const mutationCreation = `
        mutation newDispensation {
          createDispensation(
            subject: "Inert Gas",
            author: "TEST",
            sciper_author: 312067,
            description: "Rosa Test description",
            comment: "Rosa Test comment",
            date_start: "2023-09-07",
            date_end: "2023-09-29",
            rooms: [{ id: 4 }, { id: 5 }],
            holders: [{ sciper: "100192" }, { sciper: "10634" }]
          ) {
            errors {
              message
            }
            isSuccess
            slug
          }
        }
      `;

      const c = client();
      const mutationCreationResult = await c.mutation<{isSuccess: string, slug: string}>(mutationCreation);
      assert(mutationCreationResult.isSuccess);
      assert(mutationCreationResult.slug.startsWith("DSPS-"));

      if(mutationCreationResult.isSuccess){
        const mutationUpdate = `
        mutation updateDispensation {
            editDraftDispensation(
              slug: "${mutationCreationResult.slug}", 
              subject: "Inert Gas",
              author: "TEST",
              sciper_author: 312067,
              description: "Rosa Test description update|n|shdjkshjshgkhfgkdhfgjk",
              comment: "Rosa Test comment update",
              date_start: "2023-09-07",
              date_end: "2023-09-29",
              rooms: [{ id: 4 }, { id: 5 }],
              holders: [{ sciper: "100192" }, { sciper: "10634" }]
            ) {
              errors {
                message               
              }               
              isSuccess              
            }            
        }
        `;
        const mutationUpdateResult = await c.mutation<{isSuccess: string}>(mutationUpdate);
        assert(mutationUpdateResult.isSuccess);

        if(mutationUpdateResult.isSuccess){
          const mutationDelete = `
          mutation deleteDispensation {
            deleteDispensation(slug: "${mutationCreationResult.slug}") {
              errors {
                message
                extensions {
                  code
                }
              }
              isSuccess
            }
          }`;
          const mutationDeleteResult = await c.mutation<{isSuccess: string}>(mutationDelete);
          assert(mutationDeleteResult.isSuccess);
        }
      }

    });

    it("doesn't make N+1 queries", async () => {
      const dispensations = await q({})
      assert(dispensations.length>0)
      assert.isBelow(queries.length, 20)
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

          rooms { name }
          holders { name surname }
        }
        ${queryMore}
  } }`)
}
