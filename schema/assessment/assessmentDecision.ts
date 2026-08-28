import {extendType, intArg, list, objectType, stringArg} from 'nexus';
import {AssessmentDecision} from 'nexus-prisma';
import {RoomStruct} from "../global/rooms";
import {PersonStruct} from "../global/people";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {mutationStatusType} from "../statuses";
import {FileMutationType, HolderMutationType, OthersMutationType, StringMutationType} from "../../utils/mutationTypes";
import {getUserInfoFromAPI} from "../../utils/callAPI";
import {ensurePerson} from "../../model/persons";
import {UnitStruct} from "../roomdetails/units";
import {
  acceptDateString,
  acceptInteger,
  acceptSubstringInList,
  sanitizeArray,
  sanitizeBase64DataUrl,
  sanitizeOptionalField
} from "../../utils/fieldValidatePlugin";
import {sanitizeHolderMutationTypes, sanitizeMutationTypes, sanitizeSearchString,} from "../../utils/searchStrings";
import {alphanumericRegexp, freeFormTextRegexp, pathRegexp, validateId} from "../../api/lib/lhdValidators";
import {AssessmentDecisionStatus} from "@prisma/client";
import {TicketANDStruct} from "./ticket";
import {FileANDStruct} from "./files";
import {saveBase64File} from "../../utils/fileUtilities";

export const AssessmentDecisionStruct = objectType({
  name: AssessmentDecision.$name,
  definition(t) {
    t.field(AssessmentDecision.subject_other);
    t.field(AssessmentDecision.description);
    t.field(AssessmentDecision.conclusion);
    t.field(AssessmentDecision.status);
    t.field(AssessmentDecision.date);
    t.field(AssessmentDecision.created_by);
    t.field(AssessmentDecision.created_on);
    t.field(AssessmentDecision.modified_by);
    t.field(AssessmentDecision.modified_on);

    t.field('assessment', {
      type: "String",
      resolve: async (parent, _, context) => {
        return `ASMT-${parent.id_assessment_and_decision}`;
      }
    });

    t.field('subject', {
      type: "String",
      resolve: async (parent, _, context) => {
        const subject = await context.prisma.AssessmentDecisionSubject.findUnique({
          where: { id_assessment_and_decision_subject: parent.id_assessment_and_decision_subject }
        });
        return subject ? subject.subject : null;
      }
    });

    t.nonNull.list.nonNull.field('assessment_rooms', {
      type: RoomStruct,
      resolve: async (parent, _, context) => {
        const assessmentAndRooms = await context.prisma.AssessmentDecisionHasRoom.findMany({
          where: { id_assessment_and_decision: parent.id_assessment_and_decision }
        });
        const roomIDs = new Set(assessmentAndRooms.map((assessmentAndRoom) => assessmentAndRoom.id_lab));
        return await context.prisma.Room.findMany({
          where: { id: { in: [...roomIDs] }}
        })
      },
    });

    t.nonNull.list.nonNull.field('assessment_contacts', {
      type: PersonStruct,
      resolve: async (parent, _, context) => {
        const assessmentAndPeople = await context.prisma.AssessmentDecisionHasContact.findMany({
          where: { id_assessment_and_decision: parent.id_assessment_and_decision }
        });
        const peopleIDs = new Set(assessmentAndPeople.map((assessmentAndPerson) => assessmentAndPerson.id_person));
        return await context.prisma.Person.findMany({
          where: { id_person: { in: [...peopleIDs] }}
        })
      },
    });

    t.nonNull.list.nonNull.field('assessment_units', {
      type: UnitStruct,
      resolve: async (parent, _, context) => {
        const assessmentAndUnits = await context.prisma.AssessmentDecisionHasUnit.findMany({
          where: { id_assessment_and_decision: parent.id_assessment_and_decision }
        });
        const unitIDs = new Set(assessmentAndUnits.map((assessmentAndUnit) => assessmentAndUnit.id_unit));
        return await context.prisma.Unit.findMany({
          where: { id: { in: [...unitIDs] }}
        })
      },
    });

    t.nonNull.list.nonNull.field('assessment_tickets', {
      type: TicketANDStruct,
      resolve: async (parent, _, context) => {
        return await context.prisma.AssessmentDecisionHasTicket.findMany({
          where: { id_assessment_and_decision: parent.id_assessment_and_decision }
        });
      },
    });

    t.nonNull.list.nonNull.field('assessment_files', {
      type: FileANDStruct,
      resolve: async (parent, _, context) => {
        return await context.prisma.AssessmentDecisionHasFile.findMany({
          where: { id_assessment_and_decision: parent.id_assessment_and_decision }
        });
      },
    });

    t.string('id', {
      resolve: async (parent, _, context) => {
        const encryptedID = IDObfuscator.obfuscate({id: parent.id_assessment_and_decision, obj: getAssessmentDecisionToString(parent)});
        return JSON.stringify(encryptedID);
      },
    });
  }
})

export function getAssessmentDecisionToString(parent) {
  return {
    id: parent.id_assessment_and_decision,
    id_assessment_and_decision_subject: parent.id_assessment_and_decision_subject,
    subject_other: parent.subject_other,
    description: parent.description,
    conclusion: parent.conclusion,
    status: parent.status,
    date: parent.date,
    created_by: parent.created_by,
    created_on: parent.created_on,
    modified_by: parent.modified_by,
    modified_on: parent.modified_on
  };
}

export const AssessmentDecisionQuery = extendType({
  type: 'Query',
  definition(t) {
    t.crud.assessmentDecisions({ filtering: true });
  },
});

export const AssessmentDecisionsWithPaginationStruct = objectType({
  name: 'AssessmentDecisionsWithPagination',
  definition(t) {
    t.nonNull.list.nonNull.field('assessment', { type: 'AssessmentDecision' });
    t.int('totalCount');
  },
});

export const AssessmentDecisionsWithPaginationQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field("assessmentWithPagination", {
      type: "AssessmentDecisionsWithPagination",
      args: {
        skip: intArg({ default: 0 }),
        take: intArg({ default: 20 }),
        search: stringArg()
      },
      authorize: (parent, args, context) => context.user.canListAssessments,
      validate: {
        skip: acceptInteger,
        take: acceptInteger,
        search: (s) => sanitizeSearchString(s, {
          Unit: {rename: 'unit', validate: alphanumericRegexp},
          Assessment: {rename: 'assessment', validate: alphanumericRegexp},
          Status: {rename: 'status', validate: (value) => acceptSubstringInList(value, Object.values(AssessmentDecisionStatus))},
          Room: {rename: 'room', validate: alphanumericRegexp},
          Contact: {rename: 'contact', validate: alphanumericRegexp},
          Subject: {rename: 'subject', validate: alphanumericRegexp},
          Ticket: {rename: 'ticket', validate: alphanumericRegexp},
          Before: {rename: 'before', validate: acceptDateString},
          After: {rename: 'after', validate: acceptDateString},
        })
      },
      async resolve(parent, args, context) {
        const { unit, assessment, status, room, contact, subject, ticket, before, after } = args.search as any || {};
        const whereCondition = [];
        if (assessment) {
          const disp = assessment.split('-');
          const assessmentNumber = Number(disp.length > 1 ? disp[1] : disp[0]);
          if (!isNaN(assessmentNumber)) {
            whereCondition.push({id_assessment_and_decision: Number(assessmentNumber)})
          } else {
            whereCondition.push({id_assessment_and_decision: -1})
          }
        }
        if (status) {
          whereCondition.push({ status: status })
        }
        if (before) {
          whereCondition.push({ date: { lte: before } })
        }
        if (after) {
          whereCondition.push({ date: { gte: after } })
        }
        if (room) {
          whereCondition.push({ assessment_and_decision_has_room: { some: {room: {is: {name: {contains: room}}}} }})
        }
        if (unit) {
          whereCondition.push({
            OR: [
              { assessment_and_decision_has_unit: { some: {unit: {is: {name: {contains: unit}}}} }},
              { assessment_and_decision_has_unit: { some: {unit: {is: {institute: {is: {name: {contains: unit}}}}}} }},
              { assessment_and_decision_has_unit: { some: {unit: {is: {institute: {is: {school: {is: {name: {contains: unit}}}}}}}} }}
            ]
          })
        }
        if (contact) {
          whereCondition.push({
            assessment_and_decision_has_contact: {
              some: {
                contact: {
                  OR: [
                    { name: { contains: contact } },
                    { surname: { contains: contact } },
                    { email: { contains: contact } },
                    { sciper: parseInt(contact) },
                  ],
                },
              },
            }
          })
        }
        if (subject) {
          whereCondition.push({ subject: {is: {subject: {contains: subject}}}})
        }
        if (ticket) {
          whereCondition.push({ assessment_and_decision_has_ticket: { some: {ticket_number: {contains: ticket}} }})
        }

        const assessmentList = await context.prisma.AssessmentDecision.findMany({
          where: {
            AND: whereCondition
          },
          orderBy: [
            {
              id_assessment_and_decision: 'desc',
            },
          ]
        });

        const assessmentFiltered = args.take == 0 ? assessmentList : assessmentList.slice(args.skip, args.skip + args.take);
        const totalCount = assessmentList.length;

        return { assessment: assessmentFiltered, totalCount };
      }
    });
  },
});

const newAssessmentDecisionType = {
  id: stringArg(),
  subject: stringArg(),
  subject_other: stringArg(),
  description: stringArg(),
  conclusion: stringArg(),
  status: stringArg(),
  date: stringArg(),
  created_by: stringArg(),
  created_on: stringArg(),
  modified_by: stringArg(),
  modified_on: stringArg(),
  rooms: list(OthersMutationType),
  units: list(OthersMutationType),
  contacts: list(HolderMutationType),
  tickets: list(StringMutationType),
  files: list(FileMutationType)
};

export const AssessmentDecisionMutationStatus = mutationStatusType({
  name: "AssessmentDecisionMutationStatus",
  definition(t) {
    t.string('name', { description: `A string representation of the assessment_and_decision mutation.`});
  }
});

export const AssessmentDecisionMutations = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addAssessmentDecision', {
      description: `Add a new assessment`,
      args: newAssessmentDecisionType,
      type: "AssessmentDecisionMutationStatus",
      authorize: (parent, args, context) => context.user.canEditAssessments,
      validate: {
        subject: alphanumericRegexp,
        subject_other: alphanumericRegexp,
        description: freeFormTextRegexp,
        conclusion: freeFormTextRegexp,
        status: {enum: Object.values(AssessmentDecisionStatus)},
        date: acceptDateString,
        rooms: sanitizeMutationTypes,
        units: sanitizeMutationTypes,
        contacts: sanitizeHolderMutationTypes,
        tickets: (s) => sanitizeArray(s, {
          status: {validate: {enum: ["New", "Default", "Deleted"]}},
          name: {validate: alphanumericRegexp},
        }),
        files: (s) => sanitizeArray(s, {
          status: {validate: {enum: ["New", "Default", "Deleted"]}},
          base64: {validate: (s) => sanitizeBase64DataUrl(s), optional: true},
          path: {validate: (s) => sanitizeOptionalField(s, pathRegexp)},
        }),
      },
      async resolve(root, args, context) {
        const userInfo = await getUserInfoFromAPI(context.user.username);
        const subject = await context.prisma.AssessmentDecisionSubject.findUnique({where: {subject: args.subject}});
        const newcontacts = args.contacts.filter(contact => contact.status === 'New');
        await ensurePerson(context.prisma, newcontacts);
        await context.prisma.$transaction(async (tx) => {
          const ass = await tx.AssessmentDecision.create({
            data: {
              id_assessment_and_decision_subject: subject.id_assessment_and_decision_subject,
              subject_other: args.subject_other,
              description: decodeURIComponent(args.description),
              conclusion: decodeURIComponent(args.conclusion),
              status: args.status,
              date: args.date,
              created_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              created_on: new Date(),
              modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              modified_on: new Date()
            }
          });

          await setAssessmentDecisionRelations(tx, ass.id_assessment_and_decision, args);
        });
        return mutationStatusType.success();
      }
    });
    t.nonNull.field('updateAssessmentDecision', {
      description: `Update assessment and decision details.`,
      args: newAssessmentDecisionType,
      type: "AssessmentDecisionMutationStatus",
      authorize: (parent, args, context) => context.user.canEditAssessments,
      validate: {
        id: validateId,
        subject: alphanumericRegexp,
        subject_other: alphanumericRegexp,
        description: freeFormTextRegexp,
        conclusion: freeFormTextRegexp,
        status: {enum: Object.values(AssessmentDecisionStatus)},
        rooms: sanitizeMutationTypes,
        units: sanitizeMutationTypes,
        contacts: sanitizeHolderMutationTypes,
        tickets: (s) => sanitizeArray(s, {
          status: {validate: {enum: ["New", "Default", "Deleted"]}},
          name: {validate: alphanumericRegexp},
        }),
        files: (s) => sanitizeArray(s, {
          status: {validate: {enum: ["New", "Default", "Deleted"]}},
          base64: {validate: (s) => sanitizeBase64DataUrl(s), optional: true},
          path: {validate: (s) => sanitizeOptionalField(s, pathRegexp)},
        }),
      },
      async resolve(root, args, context) {
        const userInfo = await getUserInfoFromAPI(context.user.username);
        const ass = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
          'AssessmentDecision', 'id_assessment_and_decision',
          context.prisma, 'AssessmentDecision', getAssessmentDecisionToString);
        const subject = await context.prisma.AssessmentDecisionSubject.findUnique({where: {subject: args.subject}});
        const newcontacts = args.contacts.filter(contact => contact.status === 'New');
        await ensurePerson(context.prisma, newcontacts);
        await context.prisma.$transaction(async (tx) => {
          const assessment = await tx.AssessmentDecision.update({
            where: { id_assessment_and_decision: ass.id_assessment_and_decision },
            data: {
              id_assessment_and_decision_subject: subject.id_assessment_and_decision_subject,
              subject_other: args.subject_other,
              description: decodeURIComponent(args.description),
              conclusion: decodeURIComponent(args.conclusion),
              status: args.status,
              modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              modified_on: new Date()
            }
          });
          await setAssessmentDecisionRelations(tx, assessment.id_assessment_and_decision, args);
        });
        return mutationStatusType.success();
      }
    });
    t.nonNull.field('deleteAssessmentDecision', {
      description: `Delete assessment and decision details.`,
      args: newAssessmentDecisionType,
      type: "AssessmentDecisionMutationStatus",
      authorize: (parent, args, context) => context.user.canEditAssessments,
      validate: {
        id: validateId
      },
      async resolve(root, args, context) {
        const disp = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
          'AssessmentDecision', 'id_assessment_and_decision',
          context.prisma, 'AssessmentDecision', getAssessmentDecisionToString);
        await context.prisma.$transaction(async (tx) => {
          await tx.AssessmentDecisionHasRoom.deleteMany({ where: { id_assessment_and_decision: disp.id_assessment_and_decision }});
          await tx.AssessmentDecisionHasContact.deleteMany({ where: { id_assessment_and_decision: disp.id_assessment_and_decision }});
          await tx.AssessmentDecisionHasTicket.deleteMany({ where: { id_assessment_and_decision: disp.id_assessment_and_decision }});
          await tx.AssessmentDecisionHasUnit.deleteMany({ where: { id_assessment_and_decision: disp.id_assessment_and_decision }});
          await tx.AssessmentDecisionHasFile.deleteMany({ where: { id_assessment_and_decision: disp.id_assessment_and_decision }});
          await tx.AssessmentDecision.delete({ where: { id_assessment_and_decision: disp.id_assessment_and_decision }});
        });
        return mutationStatusType.success();
      }
    });
  }
});

async function setAssessmentDecisionRelations(tx, id_assessment_and_decision: number, changes) {
  for ( const contact of changes.contacts || []) {
    const p = await tx.Person.findUnique({where: {sciper: contact.sciper}});
    if ( contact.status === 'New' ) {
      await tx.AssessmentDecisionHasContact.create({
        data: {
          id_person: Number(p.id_person),
          id_assessment_and_decision: id_assessment_and_decision
        }
      });
    } else if ( contact.status === 'Deleted' ) {
      await tx.AssessmentDecisionHasContact.deleteMany({
        where: {
          id_assessment_and_decision: id_assessment_and_decision,
          id_person: p.id_person
        }
      });
    }
  }

  for ( const room of changes.rooms || []) {
    if ( room.status === 'New' ) {
      let r = undefined;
      if ( room.name ) {
        r = await tx.Room.findFirst({where: {name: room.name, isDeleted: false}})
      } else if ( room.id ) {
        r = await tx.Room.findUnique({where: {id: room.id, isDeleted: false}})
      }
      if ( !r ) throw new Error(`AssessmentDecision not created: room not found`);
      await tx.AssessmentDecisionHasRoom.create({
        data: {
          id_lab: Number(r.id),
          id_assessment_and_decision: id_assessment_and_decision
        }
      });
    } else if ( room.status === 'Deleted' ) {
      let p = await tx.Room.findFirst({where: {name: room.name}});
      if ( p ) {
        await tx.AssessmentDecisionHasRoom.deleteMany({
          where: {
            id_assessment_and_decision: id_assessment_and_decision,
            id_lab: p.id
          }
        });
      }
    }
  }

  for ( const unit of changes.units || []) {
    const u = await tx.Unit.findFirst({where: {name: unit.name}});
    if ( unit.status === 'New' ) {
      if ( !u ) throw new Error(`AssessmentDecision not created: unit not found`);
      await tx.AssessmentDecisionHasUnit.create({
        data: {
          id_unit: Number(u.id),
          id_assessment_and_decision: id_assessment_and_decision
        }
      });
    } else if ( unit.status === 'Deleted' && u) {
      await tx.AssessmentDecisionHasUnit.deleteMany({
        where: {
          id_assessment_and_decision: id_assessment_and_decision,
          id_unit: u.id
        }
      });
    }
  }

  for ( const ticket of changes.tickets || []) {
    if ( ticket.status === 'New' ) {
      await tx.AssessmentDecisionHasTicket.create({
        data: {
          id_assessment_and_decision: id_assessment_and_decision,
          ticket_number: ticket.name
        }
      });
    } else if ( ticket.status === 'Deleted' ) {
      await tx.AssessmentDecisionHasTicket.deleteMany({
        where: {
          id_assessment_and_decision: id_assessment_and_decision,
          ticket_number: ticket.name
        }
      });
    }
  }

  for ( const file of changes.files || []) {
    if ( file.status === 'New' ) {
      await tx.AssessmentDecisionHasFile.create({
        data: {
          id_assessment_and_decision: id_assessment_and_decision,
          file_path: saveBase64File(file.base64, process.env.ASSESSMENT_DECISION_DOCUMENT_FOLDER + '/' + id_assessment_and_decision + '/', file.path)
        }
      });
    } else if ( file.status === 'Deleted' ) {
      await tx.AssessmentDecisionHasFile.deleteMany({
        where: {
          id_assessment_and_decision: id_assessment_and_decision,
          file_path: file.path
        }
      });
    }
  }
}
