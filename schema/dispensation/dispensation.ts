import {extendType, intArg, list, objectType, stringArg} from 'nexus';
import {Dispensation} from 'nexus-prisma';
import {RoomStruct} from "../global/rooms";
import {PersonStruct} from "../global/people";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {mutationStatusType} from "../statuses";
import {HolderMutationType, OthersMutationType, StringMutationType} from "../../utils/mutationTypes";
import {getUserInfoFromAPI} from "../../utils/callAPI";
import {ensurePerson} from "../../model/persons";
import {TicketStruct} from "./ticket";
import {saveBase64File} from "../../utils/fileUtilities";
import {sendEmailForDispensation,} from "../../utils/email/mailer";
import {UnitStruct} from "../roomdetails/units";
import {acceptDateString, acceptInteger, acceptSubstringInList, sanitizeArray} from "../../utils/fieldValidatePlugin";
import {sanitizeHolderMutationTypes, sanitizeMutationTypes, sanitizeSearchString,} from "../../utils/searchStrings";
import {
  alphanumericRegexp,
  dispensationTicketRegexp,
  fileContentRegexp,
  fileNameRegexp,
  validateId
} from "../../api/lib/lhdValidators";
import {DispensationStatus} from "@prisma/client";

export const DispensationStruct = objectType({
  name: Dispensation.$name,
  description: `A manually-managed record for a permitted, hazardous activity.
Examples of eligible activities include using / procuring chemicals ("subject"
is "Chemical substances"), storing waste ("subject" is "Chemical waste"),
procuring / using gas with various associated hazards ("subject" being one
of "Flammable Gas", "Gas", "Inert Gas" and "Oxydising Gas") and more - LHD
operators may create new kinds of dispensations from an “other, please specify”
UI.`,
  definition(t) {
    t.field(Dispensation.renewals);
    t.field(Dispensation.subject_other);
    t.field(Dispensation.date_expiry_notified);
    t.field(Dispensation.description);
    t.field(Dispensation.comment);
    t.field(Dispensation.status);
    t.field(Dispensation.date_start);
    t.field(Dispensation.date_end);
    t.field(Dispensation.file_path);
    t.field(Dispensation.created_by);
    t.field(Dispensation.created_on);
    t.field(Dispensation.modified_by);
    t.field(Dispensation.modified_on);

    t.field('dispensation', {
      type: "String",
      resolve: async (parent, _, context) => {
        return `DISP-${parent.id_dispensation}`;
      }
    });

    t.field('subject', {
      type: "String",
      resolve: async (parent, _, context) => {
        const subject = await context.prisma.DispensationSubject.findUnique({
          where: { id_dispensation_subject: parent.id_dispensation_subject }
        });
        return subject ? subject.subject : null;
      }
    });

    t.nonNull.list.nonNull.field('dispensation_rooms', {
      type: RoomStruct,
      resolve: async (parent, _, context) => {
        const dispensationsAndRooms = await context.prisma.DispensationHasRoom.findMany({
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
        const dispensationsAndPeople = await context.prisma.DispensationHasHolder.findMany({
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
        const dispensationsAndUnits = await context.prisma.DispensationHasUnit.findMany({
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
        return await context.prisma.DispensationHasTicket.findMany({
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
    renewals: parent.renewals,
    id_dispensation_subject: parent.id_dispensation_subject,
    subject_other: parent.subject_other,
    date_expiry_notified: parent.date_expiry_notified,
    description: parent.description,
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
    t.nonNull.list.nonNull.field('dispensations', { type: 'Dispensation' });
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
      validate: {
        skip: acceptInteger,
        take: acceptInteger,
        search: (s) => sanitizeSearchString(s, {
          Unit: {rename: 'unit', validate: alphanumericRegexp},
          Dispensation: {rename: 'dispensation', validate: alphanumericRegexp},
          Status: {rename: 'status', validate: (value) => acceptSubstringInList(value, Object.values(DispensationStatus))},
          Room: {rename: 'room', validate: alphanumericRegexp},
          Holder: {rename: 'holder', validate: alphanumericRegexp},
          Subject: {rename: 'subject', validate: alphanumericRegexp},
          Ticket: {rename: 'ticket', validate: alphanumericRegexp},
        })
      },
      async resolve(parent, args, context) {
        const { unit, dispensation, status, room, holder, subject, ticket } = args.search as any || {};
        const whereCondition = [];
        if (dispensation) {
          const disp = dispensation.split('-');
          const dispNumber = Number(disp.length > 1 ? disp[1] : disp[0]);
          if (!isNaN(dispNumber)) {
            whereCondition.push({id_dispensation: Number(dispNumber)})
          } else {
            whereCondition.push({id_dispensation: -1})
          }
        }
        if (status) {
          whereCondition.push({ status: status })
        }
        if (room) {
          whereCondition.push({ dispensation_has_room: { some: {room: {is: {name: {contains: room}}}} }})
        }
        if (unit) {
          whereCondition.push({
            OR: [
              { dispensation_has_unit: { some: {unit: {is: {name: {contains: unit}}}} }},
              { dispensation_has_unit: { some: {unit: {is: {institute: {is: {name: {contains: unit}}}}}} }},
              { dispensation_has_unit: { some: {unit: {is: {institute: {is: {school: {is: {name: {contains: unit}}}}}}}} }}
            ]
          })
        }
        if (holder) {
          whereCondition.push({
            dispensation_has_holder: {
              some: {
                holder: {
                  OR: [
                    { name: { contains: holder } },
                    { surname: { contains: holder } },
                    { email: { contains: holder } },
                    { sciper: parseInt(holder) },
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
          whereCondition.push({ dispensation_has_ticket: { some: {ticket_number: {contains: ticket}} }})
        }

        const dispensationList = await context.prisma.Dispensation.findMany({
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

const newDispensationType = {
  id: stringArg(),
  renewals: intArg(),
  subject: stringArg(),
  subject_other: stringArg(),
  description: stringArg(),
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

export const DispensationMutationStatus = mutationStatusType({
  name: "DispensationMutationStatus",
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
      type: "DispensationMutationStatus",
      authorize: (parent, args, context) => context.user.canEditDispensations,
      validate: {
        subject: alphanumericRegexp,
        subject_other: alphanumericRegexp,
        description: alphanumericRegexp,
        comment: alphanumericRegexp,
        status: {enum: Object.values(DispensationStatus)},
        date_start: acceptDateString,
        date_end: acceptDateString,
        file: fileContentRegexp,
        file_name: fileNameRegexp,
        rooms: sanitizeMutationTypes,
        units: sanitizeMutationTypes,
        holders: sanitizeHolderMutationTypes,
        tickets: (s) => sanitizeArray(s, {
          status: {validate: {enum: ["New", "Default", "Deleted"]}},
          name: {validate: dispensationTicketRegexp},
        }),
      },
      async resolve(root, args, context) {
        const userInfo = await getUserInfoFromAPI(context.user.username);
        const subject = await context.prisma.DispensationSubject.findUnique({where: {subject: args.subject}});
        const newHolders = args.holders.filter(holder => holder.status === 'New');
        await ensurePerson(context.prisma, newHolders);
        const dispensation = await context.prisma.$transaction(async (tx) => {
          const disp = await tx.Dispensation.create({
            data: {
              renewals: 0,
              id_dispensation_subject: subject.id_dispensation_subject,
              subject_other: args.subject_other,
              description: decodeURIComponent(args.description),
              comment: decodeURIComponent(args.comment),
              status: args.status,
              date_start: args.date_start,
              date_end: args.date_end,
              created_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              created_on: new Date(),
              modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              modified_on: new Date()
            }
          });
          await tx.Dispensation.update({
            where: { id_dispensation: disp.id_dispensation },
            data: {
              file_path: getFilePath(args.file_name, args.file, disp.id_dispensation)
            }
          });
          await setDispensationRelations(tx, disp.id_dispensation, args);
          return disp;
        });
        const dispCreated = await context.prisma.Dispensation.findUnique({
          where: { id_dispensation: dispensation.id_dispensation },
          include: {
            subject: true,
            dispensation_has_room : { include: { room: true } },
            dispensation_has_holder: { include: { holder: true } },
            dispensation_has_unit: { include: { unit: { include: { subunpro: { include: { person: true } }, unit_has_cosec: { include: { cosec: true } } } } } },
            dispensation_has_ticket: true
            }
        });
        if (dispCreated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispCreated, 'newDispensation');
        }
        return mutationStatusType.success();
      }
    });
    t.nonNull.field('updateDispensation', {
      description: `Update dispensation details.`,
      args: newDispensationType,
      type: "DispensationMutationStatus",
      authorize: (parent, args, context) => context.user.canEditDispensations,
      validate: {
        id: validateId,
        subject: alphanumericRegexp,
        subject_other: alphanumericRegexp,
        description: alphanumericRegexp,
        comment: alphanumericRegexp,
        status: {enum: Object.values(DispensationStatus)},
        date_end: acceptDateString,
        file: fileContentRegexp,
        file_name: fileNameRegexp,
        rooms: sanitizeMutationTypes,
        units: sanitizeMutationTypes,
        holders: sanitizeHolderMutationTypes,
        tickets: (s) => sanitizeArray(s, {
          status: {validate: {enum: ["New", "Default", "Deleted"]}},
          name: {validate: dispensationTicketRegexp},
        }),
      },
      async resolve(root, args, context) {
        const userInfo = await getUserInfoFromAPI(context.user.username);
        const disp = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
          'Dispensation', 'id_dispensation',
          context.prisma, 'Dispensation', getDispensationToString);
        const subject = await context.prisma.DispensationSubject.findUnique({where: {subject: args.subject}});
        const newHolders = args.holders.filter(holder => holder.status === 'New');
        await ensurePerson(context.prisma, newHolders);
        const ren = disp.date_end < args.date_end ? (disp.renewals + 1) : disp.renewals;
        await context.prisma.$transaction(async (tx) => {
          const dispensation = await tx.Dispensation.update({
            where: { id_dispensation: disp.id_dispensation },
            data: {
              renewals: ren,
              date_expiry_notified: disp.date_expiry_notified && ren > disp.renewals ? null : disp.date_expiry_notified,
              id_dispensation_subject: subject.id_dispensation_subject,
              subject_other: args.subject_other,
              description: decodeURIComponent(args.description),
              comment: decodeURIComponent(args.comment),
              status: args.status,
              date_end: args.date_end,
              file_path: getFilePath(args.file_name, args.file, disp.id_dispensation),
              modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
              modified_on: new Date()
            }
          });
          await setDispensationRelations(tx, dispensation.id_dispensation, args);
        });
        const dispUpdated = await context.prisma.Dispensation.findUnique({
          where: { id_dispensation: disp.id_dispensation },
          include: {
            subject: true,
            dispensation_has_room : { include: { room: true } },
            dispensation_has_holder: { include: { holder: true } },
            dispensation_has_unit: { include: { unit: { include: { subunpro: { include: { person: true } }, unit_has_cosec: { include: { cosec: true } } } } } },
            dispensation_has_ticket: true
          }
        });
        if (disp.renewals < dispUpdated.renewals && dispUpdated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, 'renewDispensation');
        } else if (disp.status === 'Draft' && dispUpdated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, 'newDispensation');
        } else if (dispUpdated.status === 'Active') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, 'modifiedDispensation');
        } else if (dispUpdated.status === 'Expired' && disp.status !== 'Expired') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, 'expiredDispensation');
        } else if (dispUpdated.status === 'Cancelled' && disp.status !== 'Cancelled') {
          await sendEmailForDispensation(userInfo.userFullName, userInfo.userEmail, dispUpdated, 'cancelledDispensation');
        }
        return mutationStatusType.success();
      }
    });
    t.nonNull.field('deleteDispensation', {
      description: `Delete dispensation details.`,
      args: newDispensationType,
      type: "DispensationMutationStatus",
      authorize: (parent, args, context) => context.user.canEditDispensations,
      validate: {
        id: validateId
      },
      async resolve(root, args, context) {
        const disp = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
          'Dispensation', 'id_dispensation',
          context.prisma, 'Dispensation', getDispensationToString);
        await context.prisma.$transaction(async (tx) => {
          await tx.DispensationHasRoom.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.DispensationHasHolder.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.DispensationHasTicket.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.DispensationHasUnit.deleteMany({ where: { id_dispensation: disp.id_dispensation }});
          await tx.Dispensation.delete({ where: { id_dispensation: disp.id_dispensation }});
        });
        return mutationStatusType.success();
      }
    });
  }
});

function getFilePath (fileName, fileContent, id) {
  let filePath = '';
  if (fileContent && fileName) {
    filePath = saveBase64File(fileContent, process.env.DISPENSATION_DOCUMENT_FOLDER + '/' + id + '/', fileName)
  }
  return filePath;
}

async function setDispensationRelations(tx, id_dispensation: number, changes) {
  for ( const holder of changes.holders || []) {
    const p = await tx.Person.findUnique({where: {sciper: holder.sciper}});
    if ( holder.status === 'New' ) {
      await tx.DispensationHasHolder.create({
        data: {
          id_person: Number(p.id_person),
          id_dispensation: id_dispensation
        }
      });
    } else if ( holder.status === 'Deleted' ) {
      await tx.DispensationHasHolder.deleteMany({
        where: {
          id_dispensation: id_dispensation,
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
      if ( !r ) throw new Error(`Dispensation not created: room not found`);
      await tx.DispensationHasRoom.create({
        data: {
          id_lab: Number(r.id),
          id_dispensation: id_dispensation
        }
      });
    } else if ( room.status === 'Deleted' ) {
      let p = await tx.Room.findFirst({where: {name: room.name}});
      if ( p ) {
        await tx.DispensationHasRoom.deleteMany({
          where: {
            id_dispensation: id_dispensation,
            id_lab: p.id
          }
        });
      }
    }
  }

  for ( const unit of changes.units || []) {
    const u = await tx.Unit.findFirst({where: {name: unit.name}});
    if ( unit.status === 'New' ) {
      if ( !u ) throw new Error(`Dispensation not created: unit not found`);
      await tx.DispensationHasUnit.create({
        data: {
          id_unit: Number(u.id),
          id_dispensation: id_dispensation
        }
      });
    } else if ( unit.status === 'Deleted' && u) {
      await tx.DispensationHasUnit.deleteMany({
        where: {
          id_dispensation: id_dispensation,
          id_unit: u.id
        }
      });
    }
  }

  for ( const ticket of changes.tickets || []) {
    if ( ticket.status === 'New' ) {
      await tx.DispensationHasTicket.create({
        data: {
          id_dispensation: id_dispensation,
          ticket_number: ticket.name
        }
      });
    } else if ( ticket.status === 'Deleted' ) {
      await tx.DispensationHasTicket.deleteMany({
        where: {
          id_dispensation: id_dispensation,
          ticket_number: ticket.name
        }
      });
    }
  }
}
