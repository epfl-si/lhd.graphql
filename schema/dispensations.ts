import { objectType, extendType, nonNull, intArg, stringArg } from 'nexus';
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
        const roomRelations = await context.prisma.DispensationInRoomRelation.findMany({
          where: {
            id_dispensation_version: parent.id
          },
          include: { room: true }})
        return roomRelations.map((rr) => rr.room)
      }
    })
    t.nonNull.list.nonNull.field("holders", {
      type: "Person",
      async resolve(parent, _, context) {
        const dhrs = await context.prisma.DispensationHeldRelation.findMany({
          where: {
            id_dispensation_version: parent.id
          },
          include: { person: true }})
        return dhrs.map((dhr) => dhr.person)
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

const dispensationFieldsType = {
  author: stringArg(),
  sciper_author: intArg(),
  subject: stringArg(),
  description: stringArg(),
  comment: stringArg(),
  date_start: stringArg(),
  date_end: stringArg(),
  // TODO: more.
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
          })
          return mutationStatusType.success()
        } else if (draftAlready.length == 0) {
          await prisma.DispensationVersion.create({
            data: {
              dispensation: { connect: { id: dispensation.id }},
              status: "Pending",
              draft_status: "draft",
              date_created: new Date(),
              ...toUpsert
            }
          })
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

          await tx.DispensationVersion.create({
            data: {
              dispensation: { connect: { id: newId } },
              status: "Pending",
              draft_status: "draft",
              date_created: new Date(),
              ...normalizeDispensationVersionArgs(args)
            }
          });

          return {
            slug,
            ...mutationStatusType.success()
          };
        });
      }
    });
  }
});

function normalizeDispensationVersionArgs (args) {
  return {
    author: args.author,
    sciper_author: args.sciper_author,
    subject: args.subject,
    description: args.description,
    comment: args.comment,
    date_start: args.date_start ? new Date(args.date_start) : undefined,
    date_end: args.date_end ? new Date(args.date_end) : undefined,
    date_modified: new Date(),
    modified_by: args.author || "GraphQL",
  }
}
