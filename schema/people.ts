import { objectType, extendType } from 'nexus';
import { person } from 'nexus-prisma';

export const PersonStruct = objectType({
	name: person.$name,
	definition(t) {
		t.field(person.name);
		t.field(person.surname);
		t.field(person.sciper);
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
