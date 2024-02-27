import 'mocha'
import * as assert from 'assert'

import { GraphQLClient, useTestServer } from './testlib/graphql'

type Person = {
  name: string
  surname: string
  sciper: string
  email: string
  type: string
}

describe("End-to-end tests", () => {
  let client = useTestServer<Person>({ before, after })
  function q() { return queryPeople(client()) }

  describe("`people` type and queries", () => {
    it("has all the fields", async () => {
      const everybody = await q()
      let scipers = 0, emails = 0, names = 0, surnames = 0
      for (const person of everybody) {
        if (person.name) names++
        if (person.surname) surnames++
        if (person.sciper) scipers++
        if (person.email) emails++
      }
      assert(names > 0)
      assert(surnames > 0)
      assert(scipers > 0)
      assert(emails > 0)
    })
  })

  describe("search people", () => {
    it("has at least one person in LDAP and one person in LHD", async () => {
      const everybody = `query FullTextTest {
        personFullText(search:"urno") {
          ... on DirectoryPerson { name surname email type}
          ... on Person { name surname email type}
        }
      }`;

      const c = client();
      const result = await c.query(everybody);
      assert(result.filter(r => r.type == 'DirectoryPerson').length > 0)
      assert(result.filter(r => r.type == 'Person').length > 0)
    })
    it("has at least one person in LHD and no LDAP", async () => {
      const everybody = `query FullTextTest {
        personFullText(search:"urno", lhdOnly: true) {
          ... on DirectoryPerson { name surname email type}
          ... on Person { name surname email type}
        }
      }`;

      const c = client();
      const result = await c.query(everybody);
      assert(result.filter(r => r.type == 'DirectoryPerson').length == 0)
      assert(result.filter(r => r.type == 'Person').length > 0)
    })
  })
})

async function queryPeople(client : GraphQLClient<Person>) : Promise< Array<Person> > {
  return client.query(`{ people (where : {}) {
        name
        surname
        sciper
        email
  } }`)
}
