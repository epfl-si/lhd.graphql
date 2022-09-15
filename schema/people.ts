import { objectType, extendType } from 'nexus';
import { person } from 'nexus-prisma';

export const PersonStruct = objectType({
	name: person.$name,
	description: `A physical person at EPFL.`,
	definition(t) {
		t.field(person.name);
		t.field(person.surname);
		t.field({...person.sciper,
                        description: `A lifelong-unique alphanumerical identifier for persons.

SCIPER means Système Central d'Identification des PERsonnes, i.e.
Central System for Personal Identity. A SCIPER “number” may in fact
start with a letter for special categories (e.g. G for guests, i.e.
neither employees nor students), followed by a sequence of (usually)
six digits.

The identifier is lifelong-unique, meaning that students and alumni
who later get a job at EPFL keep the same SCIPER. Guest SCIPERs have
their own separate unicity criteria, or lack thereof (they last for
one year and cannot have the same email address as another guest); but
they are still built out of a growing sequence, meaning that no two
guests will ever have the same SCIPER regardless of the time they were
created or destroyed.`});
		t.field(person.email);
	},
});

export const nilPersonId = 185;  // Name is “Available.” “Not” Available.

export const PersonQuery = extendType({
  type: 'Query',
  definition(t) {
    t.crud.people({ filtering: true });
  }
  // TODO: filter out nilPersonId
})
