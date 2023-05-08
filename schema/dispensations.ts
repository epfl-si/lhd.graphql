import { objectType, extendType } from 'nexus';
import { Dispensation, DispensationVersion } from 'nexus-prisma';

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
      type: 'DispensationVersion'
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
  }
})


export const DispensationsQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.dispensations({filtering: false});
	},
});
