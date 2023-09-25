import { objectType, extendType, inputObjectType, nonNull, list, intArg, stringArg } from 'nexus';
import { Dispensation, DispensationVersion } from 'nexus-prisma';
import { mutationStatusType } from './statuses';

export const DispensationStruct = objectType({
  name: Dispensation.$name,
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
    // We do *not* expose the ID; as far as GraphQL clients are
    // concerned, the slug is the primary key.
    t.field(Dispensation.slug)
    t.nonNull.list.nonNull.field("versions", {
      type: 'DispensationVersion',
      async resolve(parent, _, context) {
        const dispensation = context.prisma.Dispensation.findUnique({
          where: { id: parent.id } })
        return dispensation.versions()
      }
    })
  }
})

export const DispensationVersionStruct = objectType({
  name: DispensationVersion.$name,
  description: `One of the temporally-bound revisions of a Dispensation.`,

  definition(t) {
    for (const f of [
      'id',
      'author',
      'subject',
      'description',
      'comment',
      'status',
      'draft_status',
      'date_start',
      'date_end',
      'date_created',
      'date_modified',
      'modified_by'
    ]) {
      t.field(DispensationVersion[f]);
    }
    t.nonNull.list.nonNull.field("rooms", {
      type: "Room",
      async resolve(parent, _, context) {
          const thisVersion = context.prisma.DispensationVersion.findUnique(
              {where: {id: parent.id}})
          const rooms = []
          for (const roomRelation of await thisVersion.in_room()) {
            rooms.push(await context.prisma.Room.findUnique({ where: { id: roomRelation.id_room }}))
          }
          return rooms
      }
    })
    t.nonNull.list.nonNull.field("holders", {
      type: "Person",
      async resolve(parent, _, context) {
        const thisVersion = context.prisma.DispensationVersion.findUnique(
            {where: {id: parent.id}})
        const persons = []
        for (const heldRelation of await thisVersion.held()) {
          persons.push(await context.prisma.Person.findUnique({ where: { id_person: heldRelation.id_person }}))
        }
        return persons
      }
    })
  }
})


export const DispensationsQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.dispensations({filtering: true});
	},
});

export const DispensationEditStatus = mutationStatusType({
  name: "DispensationEditStatus"
});

export const DispensationCommitStatus = mutationStatusType({
  name: "DispensationCommitStatus"
});

export const DispensationHolder = inputObjectType({
  name: "DispensationHolder",
  definition(t) {
    t.nonNull.string('sciper');
  }
})

export const DispensationRoom = inputObjectType({
  name: "DispensationRoom",
  definition(t) {
    t.nonNull.int('id');
  }
})

const dispensationFieldsType = {
  author: stringArg(),
  sciper_author: intArg(),
  subject: stringArg(),
  description: stringArg(),
  comment: stringArg(),
  date_start: stringArg(),
  date_end: stringArg(),
  holders: list(nonNull(DispensationHolder)),
  rooms: list(nonNull(DispensationRoom)),
};

export const DispensationVersionMutations = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('editDraftDispensation', {
      type: 'DispensationEditStatus',
      args: {
        slug: nonNull(stringArg()),
        ...dispensationFieldsType
        // TODO: edit the 1-N relationships (DispensationHeldRelation, DispensationInRoomRelation)
      },
      async resolve(root, args, context) {
        const slug = args.slug, prisma = context.prisma
        const dispensation = await prisma.Dispensation.findUnique(
          { where: { slug }})
        if (! dispensation) {
          return mutationStatusType.error(`Unknown dispensation ${slug}`)
        }

        const draftAlready = await prisma.DispensationVersion.findMany({ where: {
          id_dispensation: dispensation.id,
          draft_status: 'draft'
          }})
        const toUpsert = normalizeDispensationVersionArgs(args);

        if (draftAlready.length == 1) {
          await prisma.DispensationVersion.update({
            where: {
              id: draftAlready[0].id
            },
            data: { ...toUpsert, modified_by: args.author }
          });
          await setRoomsAndHolders(prisma, draftAlready[0], args.rooms, args.holders);
          return mutationStatusType.success()
        } else if (draftAlready.length == 0) {
          const draftVersion = await prisma.DispensationVersion.create({
            data: {
              dispensation: { connect: { id: dispensation.id }},
              status: "Pending",
              draft_status: "draft",
              date_created: new Date(),
              ...toUpsert
            }
          });
          await setRoomsAndHolders(prisma, draftVersion, args.rooms, args.holders);
          return mutationStatusType.success()
        } else {
          return mutationStatusType.error(`${slug} has multiple drafts!!`)
        }
      }
    });

    // TODO: implement this.
    t.nonNull.field('commitDispensation', {
      description: `Move a Dispensation currently in draft state into final state.`,
      type: 'DispensationCommitStatus',
    });
  }
})

export const DispensationCreateStatus = mutationStatusType({
  name: "DispensationCreateStatus",
  definition(t) {
    t.string('slug', { description: `A string representation of the new Dispensation's object identity; may be thereafter passed to e.g. \`editDraftDispensation\``});
  }
});


export const DispensationDeleteeStatus = mutationStatusType({
  name: "DispensationDeleteStatus"
});


export const DispensationMutations = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createDispensation', {
      description: `Create a new Dispensation object in draft state.`,
      args: {
        ...dispensationFieldsType
        // TODO: create the 1-N relationships (DispensationHeldRelation, DispensationInRoomRelation)
      },
      type: "DispensationCreateStatus",
      async resolve(root, args, context) {
        const prisma = context.prisma;
        return await prisma.$transaction(async (tx) => {
          const newId = (await tx.Dispensation.create({ data: {
            slug: "CHANGEME",   // Below
          }})).id;

          const slug = `DSPS-${newId}`;
          await tx.Dispensation.update(
            { where: { id: newId },
              data: { slug }});

          const theVersion = await tx.DispensationVersion.create({
            data: {
              dispensation: { connect: { id: newId } },
              status: "Pending",
              draft_status: "draft",
              date_created: new Date(),
              ...normalizeDispensationVersionArgs(args)
            }
          });

          await setRoomsAndHolders(tx, theVersion, args.rooms, args.holders);

          return {
            slug,
            ...mutationStatusType.success()
          };
        });
      }
    });

    t.nonNull.field('deleteDispensation', {
      description: 'Delete a Dispensation.',
      args: {
        slug: nonNull(stringArg())
      },
      type: "DispensationDeleteStatus",
      async resolve (root, args, context) {
        const slug = args.slug;
        await context.prisma.$transaction(async (tx) => {
          const dispensation = await tx.Dispensation.findUnique({ where: { slug }});
          if (! dispensation) {
            throw new Error(`Dispensation ${slug} not found`);
          }

          const versionIDsSet : Set<number> = new Set();
          for (const v of await tx.DispensationVersion.findMany(
            { where: { id_dispensation : dispensation.id },
              select: { id : true }})) {
            versionIDsSet.add(v.id);
          }
          const versionIDs = [...versionIDsSet.values() ];

          for (const table of [tx.DispensationHeldRelation,
                                   tx.DispensationInRoomRelation]) {
            await table.deleteMany({
              where: { id_dispensation_version: { in: versionIDs } } });
          }

          await tx.DispensationVersion.deleteMany({
            where: { id: { in: versionIDs } } });

          await tx.Dispensation.delete({
            where: { id: dispensation.id } });
        });
        return mutationStatusType.success();
      }  // async resolve
    });  // t.nonNull.field
  }  // definition(t)
});  // extendType

function normalizeDispensationVersionArgs (args) {
  return {
    author: args.author,
    sciper_author: args.sciper_author,
    subject: args.subject,
    description: args.description,
    comment: args.comment,
    date_start: args.date_start ? new Date(args.date_start) : new Date(),
    date_end: args.date_end ? new Date(args.date_end) : undefined,
    date_modified: new Date(),
    modified_by: args.author || "GraphQL",
  }
}

async function setRoomsAndHolders (prisma: any,
  dispensationVersion: DispensationVersion,
  rooms: null | { id : number }[],
  holders: null | { sciper : string }[]) {
    const id_dispensation_version = dispensationVersion.id,
    where = { id_dispensation_version },
    connect_dispensation_version = { connect : { id: id_dispensation_version } };

    if (rooms) {
      const wantRooms = setOfArray(rooms.map((room) => room.id));
      const existing : number[] = (await prisma.DispensationInRoomRelation.findMany({ where })).map((dirr) => dirr.id_room);

      await prisma.DispensationInRoomRelation.deleteMany({
        where: {
          id_room: { in: existing.filter(roomId => ! wantRooms.has(roomId)) },
          ...where
        }
      });

      for (const addRoom of setDifference(wantRooms, existing)) {
          await prisma.DispensationInRoomRelation.create({
            data: {
              room: { connect: { id: addRoom } },
              dispensation_version: connect_dispensation_version
            }
          });
      }
    }

    if (holders) { 
      const wantHolders = setOfArray(holders.map((h) => h.sciper));
      const existing = (await prisma.DispensationHeldRelation.findMany({ where,
        include: { person: true } 
      })).map((e) => ({
        id: e.id_person as number,
        // Sadly, the current database schema uses integers for SCIPERs:
        sciper: String(e.person.sciper)
      }));

      await prisma.DispensationHeldRelation.deleteMany({
        where: {
          id_person: { in: existing.filter(({ sciper }) => ! wantHolders.has(sciper)).map((e) => e.id) },
          ...where
        }
      });

      for (const addHolder of setDifference(wantHolders, existing.map((e) => e.sciper))) {
          await prisma.DispensationHeldRelation.create({
            data: {
              person: { connect: { sciper:
                // See comment above:
                parseInt(addHolder) } },
              dispensation_version: connect_dispensation_version
            }
          });
      }
    }
}

function setOfArray<T>(a: T[]) : Set<T> {
  const set = new Set<T>;
  for (const item of a) {
    set.add(item);
  }
  return set;
}

function setFilter<T>(a : Set<T>, predicate: (t: T) => boolean) {
  const filtered = new Set<T>;
  for (const item of a) {
    if (predicate(item)) {
      filtered.add(item);
    }
  }
  return filtered;
}

function setDifference<T>(a : Set<T>, b : T[] | Set<T>) {
  const bSet : Set<T> = (b instanceof Array) ? setOfArray(b) : b;
  return setFilter(a, (item) => ! bSet.has(item));
}
