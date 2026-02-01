import {extendType, intArg, list, objectType, stringArg} from 'nexus';
import {dispensation} from 'nexus-prisma';
import {RoomStruct} from "../global/rooms";
import {PersonStruct} from "../global/people";
import {ID, IDObfuscator} from "../../utils/IDObfuscator";
import {mutationStatusType} from "../statuses";
import {HolderMutationType, OthersMutationType, StringMutationType} from "../../utils/MutationTypes";
import {getUserInfoFromAPI} from "../../utils/CallAPI";
import {checkRelationsForDispensation} from "../../model/dispensation";
import {ensurePerson} from "../../model/persons";
import {TicketStruct} from "./ticket";
import {saveBase64File} from "../../utils/File";
import {sendEmailForDispensation,} from "../../utils/Email/Mailer";
import {EMAIL_TEMPLATES} from "../../utils/Email/EmailTemplates";
import {UnitStruct} from "../roomdetails/units";

export const DispensationStruct = objectType({
  name: dispensation.$name,
  description: `A manually-managed record for a permitted, hazardous activity.

Examples of eligible activities include using / procuring chemicals ("subject"
is "Chemical substances"), storing waste ("subject" is "Chemical waste"),
procuring / using gas with various associated hazards ("subject" being one
of "Flammable Gas", "Gas", "Inert Gas" and "Oxydising Gas") and more - LHD
operators may create new kinds of dispensations from an “other, please specify”
UI.

Dispensations have a **slug**, which is a symbolic denominator that is unique
through the lifecycle of the dispensation, and is always of the form DSPS-nnn,
where nnn is a sequence number as an integer. All the other fields are mutable
and recorded indirectly in a DispensationVersion object.
`,
  definition(t) {
    t.field(dispensation.dispensation);
    t.field(dispensation.renewals);
    t.field(dispensation.other_subject);
    t.field(dispensation.requires);
    t.field(dispensation.comment);
    t.field(dispensation.status);
    t.field(dispensation.date_start);
    t.field(dispensation.date_end);
    t.field(dispensation.file_path);
    t.field(dispensation.created_by);
    t.field(dispensation.created_on);
    t.field(dispensation.modified_by);
    t.field(dispensation.modified_on);

    t.field('subject', {
      type: "String",
      resolve: async (parent, _, context) => {
        const subject = await context.prisma.dispensation_subject.findUnique({
          where: { id_dispensation_subject: parent.id_dispensation_subject }
        });
        return subject ? subject.subject : null;
      }
    });

    t.nonNull.list.nonNull.field('dispensation_rooms', {
      type: RoomStruct,
      resolve: async (parent, _, context) => {
        const dispensationsAndRooms = await context.prisma.dispensation_has_room.findMany({
          where: { id_dispensation: parent.id_dispensation }
        });
        const roomIDs = new Set(dispensationsAndRooms.map((dispensationAndRoom) => dispensationAndRoom.id_lab));
        return await context.prisma.Room.findMany({
          where: { id: { in: [...roomIDs] }}
        })
      },
    });

    t.nonNull.list.nonNull.field('dispensation_holders', {
      type: PersonStruct,
      resolve: async (parent, _, context) => {
        const dispensationsAndPeople = await context.prisma.dispensation_has_holder.findMany({
          where: { id_dispensation: parent.id_dispensation }
        });
        const peopleIDs = new Set(dispensationsAndPeople.map((dispensationAndPerson) => dispensationAndPerson.id_person));
        return await context.prisma.Person.findMany({
          where: { id_person: { in: [...peopleIDs] }}
        })
      },
    });

    t.nonNull.list.nonNull.field('dispensation_units', {
      type: UnitStruct,
      resolve: async (parent, _, context) => {
        const dispensationsAndUnits = await context.prisma.dispensation_has_unit.findMany({
          where: { id_dispensation: parent.id_dispensation }
        });
        const unitIDs = new Set(dispensationsAndUnits.map((dispensationsAndUnit) => dispensationsAndUnit.id_unit));
        return await context.prisma.Unit.findMany({
          where: { id: { in: [...unitIDs] }}
        })
      },
    });

    t.nonNull.list.nonNull.field('dispensation_tickets', {
      type: TicketStruct,
      resolve: async (parent, _, context) => {
        return await context.prisma.dispensation_has_ticket.findMany({
          where: { id_dispensation: parent.id_dispensation }
        });
      },
    });

    t.string('id', {
      resolve: async (parent, _, context) => {
        const encryptedID = IDObfuscator.obfuscate({id: parent.id_dispensation, obj: getDispensationToString(parent)});
        return JSON.stringify(encryptedID);
      },
    });
  }
})

export function getDispensationToString(parent) {
  return {
    id: parent.id_dispensation,
    dispensation: parent.dispensation,
    renewals: parent.renewals,
    id_dispensation_subject: parent.id_dispensation_subject,
    other_subject: parent.other_subject,
    requires: parent.requires,
    comment: parent.comment,
    status: parent.status,
    date_start: parent.date_start,
    date_end: parent.date_end,
    file_path: parent.file_path,
    created_by: parent.created_by,
    created_on: parent.created_on,
    modified_by: parent.modified_by,
    modified_on: parent.modified_on
  };
}

export const DispensationQuery = extendType({
  type: 'Query',
  definition(t) {
    t.crud.dispensations({ filtering: true });
  },
});

export const DispensationsWithPaginationStruct = objectType({
  name: 'DispensationsWithPagination',
  definition(t) {
    t.list.field('dispensations', { type: 'dispensation' });
    t.int('totalCount');
  },
});

export const DispensationsWithPaginationQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field("dispensationsWithPagination", {
      type: "DispensationsWithPagination",
      args: {
        skip: intArg({ default: 0 }),
        take: intArg({ default: 20 }),
        search: stringArg()
      },
      authorize: (parent, args, context) => context.user.canListDispensations,
      async resolve(parent, args, context) {
        const queryArray = args.search.split("&");
        const dictionary = queryArray.map(query => query.split("="));
        const whereCondition = [];
        if (dictionary.length == 0) {
          whereCondition.push({ dispensation: { contains: '' }})
        } else {
          dictionary.forEach(query => {
            const value = decodeURIComponent(query[1]);
            if (query[0] === 'Dispensation') {
              whereCondition.push({ dispensation: { contains: value }})
            } else if (query[0] === 'Status') {
              whereCondition.push({ status: { contains: value }})
            } else if (query[0] === 'Room') {
              whereCondition.push({ dispensation_has_room: { some: {room: {is: {name: {contains: value}}}} }})
            } else if (query[0] === 'Unit') {
              whereCondition.push({
                OR: [
                  { dispensation_has_unit: { some: {unit: {is: {name: {contains: value}}}} }},
                  { dispensation_has_unit: { some: {unit: {is: {institute: {is: {name: {contains: value}}}}}} }},
                  { dispensation_has_unit: { some: {unit: {is: {institute: {is: {school: {is: {name: {contains: value}}}}}}}} }}
                ]
              })
            } else if (query[0] === 'Holder') {
              whereCondition.push({
                dispensation_has_holder: {
                  some: {
                    holder: {
                      OR: [
                        { name: { contains: value } },
                        { surname: { contains: value } },
                        { email: { contains: value } },
                        { sciper: parseInt(value) },
                      ],
                    },
                  },
                }
              })
            } else if (query[0] === 'Subject') {
              whereCondition.push({ subject: {is: {subject: {contains: value}}}})
            } else if (query[0] === 'Ticket') {
              whereCondition.push({ dispensation_has_ticket: { some: {ticket_number: {contains: value}} }})
            }
          })
        }

        const dispensationList = await context.prisma.dispensation.findMany({
          where: {
            AND: whereCondition
          },
          orderBy: [
            {
              id_dispensation: 'desc',
            },
          ]
        });

        const dispensations = args.take == 0 ? dispensationList : dispensationList.slice(args.skip, args.skip + args.take);
        const totalCount = dispensationList.length;

        return { dispensations, totalCount };
      }
    });
  },
});

export const DispensationsByRoom = extendType({
  type: 'Query',
  definition(t) {
    t.field("dispensationsByRoom", {
      type: list('dispensation'),
      args: {
        skip: intArg({ default: 0 }),
        take: intArg({ default: 20 }),
        roomId: stringArg(),
        type: stringArg()
      },
      authorize: (parent, args, context) => context.user.canListDispensations,
      async resolve(parent, args, context) {
        if (args.roomId) {
          const id: ID = JSON.parse(args.roomId);
          IDObfuscator.checkId(id);
          IDObfuscator.checkSalt(id)
          const idDeobfuscated = IDObfuscator.deobfuscateId(id);
          return await context.prisma.dispensation.findMany({
            where: {
              dispensation_has_room: {
                some: {
                  room: {
                    is: {
                      id: idDeobfuscated
                    }
                  }
                }
              }
            },
            orderBy: [
              {
                dispensation: 'asc',
              },
            ]
          });
        }
        return [];
      }
    });
  },
});

const newDispensationType = {
  id: stringArg(),
  dispensation: stringArg(),
  renewals: intArg(),
  subject: stringArg(),
  other_subject: stringArg(),
  requires: stringArg(),
  comment: stringArg(),
  status: stringArg(),
  date_start: stringArg(),
  date_end: stringArg(),
  file: stringArg(),
  file_name: stringArg(),
  created_by: stringArg(),
  created_on: stringArg(),
  modified_by: stringArg(),
  modified_on: stringArg(),
  rooms: list(OthersMutationType),
  units: list(OthersMutationType),
  holders: list(HolderMutationType),
  tickets: list(StringMutationType),
};

export const DispensationStatus = mutationStatusType({
  name: "DispensationStatus",
  definition(t) {
    t.string('name', { description: `A string representation of the dispensation mutation.`});
  }
});

export const DispensationMutations = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addDispensation', {
      description: `Add a new dispensation`,
      args: newDispensationType,
      type: "DispensationStatus",
      authorize: (parent, args, context) => context.user.canEditDispensations,
      async resolve(root, args, context) {
        const userInfo = await getUserInfoFromAPI(context.user.username);
        const subject = await context.prisma.dispensation_subject.findUnique({where: {subject: args.subject}});
        const newHolders = args.holders.filter(holder => holder.status === 'New');
        await ensurePerson(newHolders, context.prisma);
        const date = args.date_start ?? (new Date()).toLocaleDateString("en-GB");
        const [dayCrea, monthCrea, yearCrea] = date.split("/").map(Number);
        const [day, month, year] = args.date_end.split("/").map(Number);
        const dispensation = await context.prisma.$transaction(async (tx) => {
          const disp = await tx.dispensation.create({
            data: {
              dispensation: `DISP-TEMP`,
              renewals: 0,
              id_dispensation_subject: subject.id_dispensation_subject,
              other_subject: args.other_subject,
              requires: decodeURIComponent(args.requires),
              comment: decodeURIComponent(args.comment),
              status: args.status,
              date_start: new Date(yearCrea, monthCrea - 1, dayCrea, 12),
              date_end: new Date(year, month - 1, day, 12),
              created_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              created_on: new Date(),
              modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              modified_on: new Date()
            }
          });
          await tx.dispensation.update({
            where: { id_dispensation: disp.id_dispensation },
            data: {
              dispensation: `DISP-${disp.id_dispensation}`,
              file_path: getFilePath(args, disp.id_dispensation)
            }
          });
          await checkRelationsForDispensation(tx, args, disp);
          return disp;
        });
        const dispCreated = await context.prisma.dispensation.findUnique({
          where: { id_dispensation: dispensation.id_dispensation },
          include: {
            subject: true,
            dispensation_has_room : { include: { room: true } },
            dispensation_has_holder: { include: { holder: true } },
            dispensation_has_unit: { include: { unit: { include: { subunpro: { include: { person: true } } } } } },
            dispensation_has_ticket: true
            }
        });
        if (dispCreated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispCreated, EMAIL_TEMPLATES.NEW_DISPENSATION);
        }
        return mutationStatusType.success();
      }
    });
    t.nonNull.field('updateDispensation', {
      description: `Update dispensation details.`,
      args: newDispensationType,
      type: "DispensationStatus",
      authorize: (parent, args, context) => context.user.canEditDispensations,
      async resolve(root, args, context) {
        const userInfo = await getUserInfoFromAPI(context.user.username);
        const disp = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
          'dispensation', 'id_dispensation',
          context.prisma, 'Dispensation', getDispensationToString);
        const subject = await context.prisma.dispensation_subject.findUnique({where: {subject: args.subject}});
        const newHolders = args.holders.filter(holder => holder.status === 'New');
        await ensurePerson(newHolders, context.prisma);
        const [day, month, year] = args.date_end.split("/").map(Number);
        const newDateEnd = new Date(year, month - 1, day, 12);
        disp.date_end.setHours(12, 0, 0, 0);
        const ren = disp.date_end < newDateEnd ? (disp.renewals + 1) : disp.renewals;
        await context.prisma.$transaction(async (tx) => {
          const dispensation = await tx.dispensation.update({
            where: { id_dispensation: disp.id_dispensation },
            data: {
              renewals: ren,
              id_dispensation_subject: subject.id_dispensation_subject,
              other_subject: args.other_subject,
              requires: decodeURIComponent(args.requires),
              comment: decodeURIComponent(args.comment),
              status: args.status,
              date_end: newDateEnd,
              file_path: getFilePath(args, disp.id_dispensation),
              modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              modified_on: new Date()
            }
          });
          await checkRelationsForDispensation(tx, args, dispensation);
        });
        const dispUpdated = await context.prisma.dispensation.findUnique({
          where: { id_dispensation: disp.id_dispensation },
          include: {
            subject: true,
            dispensation_has_room : { include: { room: true } },
            dispensation_has_holder: { include: { holder: true } },
            dispensation_has_unit: { include: { unit: { include: { subunpro: { include: { person: true } } } } } },
            dispensation_has_ticket: true
          }
        });
        if (disp.renewals < dispUpdated.renewals && dispUpdated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, EMAIL_TEMPLATES.RENEW_DISPENSATION);
        } else if (disp.status === 'Draft' && dispUpdated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, EMAIL_TEMPLATES.NEW_DISPENSATION);
        } else if (dispUpdated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, EMAIL_TEMPLATES.MODIFIED_DISPENSATION);
        } else if (dispUpdated.status === 'Expired' && disp.status !== 'Expired') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, EMAIL_TEMPLATES.EXPIRED_DISPENSATION);
        } else if (dispUpdated.status === 'Cancelled' && disp.status !== 'Cancelled') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, EMAIL_TEMPLATES.CANCELLED_DISPENSATION);
        }
        return mutationStatusType.success();
      }
    });
    t.nonNull.field('deleteDispensation', {
      description: `Delete dispensation details.`,
      args: newDispensationType,
      type: "DispensationStatus",
      authorize: (parent, args, context) => context.user.canEditDispensations,
      async resolve(root, args, context) {
        const disp = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
          'dispensation', 'id_dispensation',
          context.prisma, 'Dispensation', getDispensationToString);
        await context.prisma.$transaction(async (tx) => {
          await tx.dispensation_has_room.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.dispensation_has_holder.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.dispensation_has_ticket.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.dispensation_has_unit.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.dispensation.delete({ where: { id_dispensation: disp.id_dispensation }});
        });
        return mutationStatusType.success();
      }
    });
  }
});

function getFilePath (args, id) {
  let filePath = '';
  if (args.file && args.file_name) {
    filePath = saveBase64File(args.file, process.env.DISPENSATION_DOCUMENT_FOLDER + '/' + id + '/', args.file_name)
  }
  return filePath;
}
