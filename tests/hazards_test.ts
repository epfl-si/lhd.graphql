import 'mocha'
import * as assert from 'assert'

import { GraphQLClient, useTestServer } from './testlib/graphql'


export type roomDetailsType = {
  name: string;
  hazards: hazardType[];
};

export type hazardType = {
  id: string;
  submission: string;
  hazard_form_history: hazardFormHistoryType;
}

export type hazardFormHistoryType = {
  form: string;
  version: string;
  hazard_form: hazardFormType;
}

export type hazardFormType = {
  form: string;
  version: string;
  hazard_category: hazardCategory;
}

export type hazardCategory = {
  hazard_category_name: string;
}

describe("End-to-end tests", () => {
  let client = useTestServer<roomDetailsType>({ before, after })
  function q() { return queryHazards(client()) }

  describe("`Hazards` encryption tests", () => {
    it("has encrypted ID", async () => {
      const hazards = await q()
      for (const h of hazards[0].hazards) {
        assert(h.id && h.id != '')
      }
    })
    it("has cannot save without ID", async () => {
      const hazards = await modifyHazards(client(), `mutation addHazard {
               addHazardToRoom(room: "CH A2 434", 
               submission: "${JSON.stringify([{"id":{"salt":"b04a63b172a592e7fca88f4c04a6491c","eph_id":"U2FsdGVkX1+bb8ZwlFwoXecXTseLrLSw1nb6R5oM+rvqmN+/DX1R/Gqa+cExBfW+wSliPGSAOFHqGcwY3R8daw==-c512819cad024cbfbdfd0ce0e3295bc4efebe019f689d0a504471c63c944d778"},"submission":{"data":{"laserClass":"1M","laserMode":"continuousWave","laserWavelengthNm":325,"laserPowerW":0.00015,"laserEnergyJ":"","laserPulseLengthNs":"","laserFrequencyHz":200000,"submit":false},"metadata":{"selectData":{"laserClass":{"label":"1M"},"laserMode":{"label":"Continuous-wave"}}}}}]).replaceAll('"','\\"')}" 
               category: "Laser")
               {
                errors {
                  message
                }
                isSuccess
              }
            }`);
      assert(hazards['data'].addHazardToRoom.errors[0].message == 'Not allowed to update hazards')
    })
    it("has cannot save with empty ID", async () => {
      const hazards = await modifyHazards(client(), `{
               addHazardToRoom(room: "CH A2 434", 
               submission: "${JSON.stringify([{"id":{"salt":"","eph_id":""},"submission":{"data":{"laserClass":"1M","laserMode":"continuousWave","laserWavelengthNm":325,"laserPowerW":0.00015,"laserEnergyJ":"","laserPulseLengthNs":"","laserFrequencyHz":200000,"submit":false},"metadata":{"selectData":{"laserClass":{"label":"1M"},"laserMode":{"label":"Continuous-wave"}}}}}])}" 
               category: "Laser")
               {
                errors {
                  message
                }
                isSuccess
              }
            }`)
      assert(hazards['data'].addHazardToRoom.errors[0].message == 'Not allowed to update hazards')
    })
    it("has cannot save without doing select before", async () => {
      const hazards = await modifyHazards(client(), `{
               addHazardToRoom(room: "CH A2 434", 
               submission: "${JSON.stringify([{"id":{"salt":"b04a63b172a592e7fca88f4c04a6491c","eph_id":"U2FsdGVkX1+bb8ZwlFwoXecXTseLrLSw1nb6R5oM+rvqmN+/DX1R/Gqa+cExBfW+wSliPGSAOFHqGcwY3R8daw==-c512819cad024cbfbdfd0ce0e3295bc4efebe019f689d0a504471c63c944d778"},"submission":{"data":{"laserClass":"1M","laserMode":"continuousWave","laserWavelengthNm":325,"laserPowerW":0.00015,"laserEnergyJ":"","laserPulseLengthNs":"","laserFrequencyHz":200000,"submit":false},"metadata":{"selectData":{"laserClass":{"label":"1M"},"laserMode":{"label":"Continuous-wave"}}}}}])}" 
               category: "Laser")
               {
                errors {
                  message
                }
                isSuccess
              }
            }`)
      assert(hazards['data'].addHazardToRoom.errors[0].message == 'Bad descrypted request')
    })
    it("has can save by doing select before", async () => {
      const room = await q()
      const h = room[0].hazards[0];
      const hazards = await modifyHazards(client(), `{
               addHazardToRoom(room: "CH A2 434", 
               submission: "${JSON.stringify([{"id":h.id,"submission":h.submission}])}" 
               category: "${h.hazard_form_history.hazard_form.hazard_category.hazard_category_name}")
               {
                errors {
                  message
                }
                isSuccess
              }
            }`)
      assert(hazards['data'].addHazardToRoom.isSuccess)
    })
  })

})

async function queryHazards(client : GraphQLClient<roomDetailsType>) : Promise< Array<roomDetailsType> > {
  return client.query(`{
  rooms (where: { name: { equals: "CH A2 434"} }) {
    name
    hazards {
      submission
      id
      hazard_form_history {
        form
        version
        hazard_form {
          form
        version
          hazard_category {
            hazard_category_name
          }
        }
      }
    }
  }
}`)
}

async function modifyHazards(client : GraphQLClient<roomDetailsType>, query: string) : Promise< Array<any> > {
  return client.mutation(query)
}
