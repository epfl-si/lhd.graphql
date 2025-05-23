import { objectType, extendType, stringArg, booleanArg, list, unionType } from 'nexus';
import { Person } from 'nexus-prisma';
import {getUsersFromApi} from "../../utils/CallAPI";

export const PersonStruct = objectType({
	name: Person.$name,
	description: `A physical person at EPFL.`,
	definition(t) {
		t.field(Person.name);
		t.field(Person.surname);
		t.field({...Person.sciper,
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
		t.field(Person.email);
		t.string("type");
	},
});

export const nilPersonId = 185;  // Name is “Available.” “Not” Available.

export const PersonQuery = extendType({
  type: 'Query',
  definition(t) {
    t.crud.people({ filtering: true,
			resolve: async (root, args, context, info, originalResolve) => {
				// Ensure user is authenticated
				if (!context.user) {
					throw new Error('Unauthorized');
				}

				// Check if user has the right to access rooms (customize this logic)
				if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1) {
					throw new Error('Permission denied');
				}

				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
  }
  // TODO: filter out nilPersonId
})

export const DirectoryPerson = objectType({
	name: "DirectoryPerson",
	definition(t) {
		t.string("name")
		t.string("surname")
		t.string("email")
		t.int("sciper")
		t.string("type")
	}
})

export const DirectoryOrLhdPerson = unionType({
	name: "DirectoryOrLhdPerson",
	definition(t) {
		t.members("Person", "DirectoryPerson");
	},
	resolveType(item) { return "id_person" in item ? "Person" : "DirectoryPerson"}
});

export const PersonFullTextQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("personFullText", {
			type: list("DirectoryOrLhdPerson"),
			args: {
				search: stringArg(),
				lhdOnly: booleanArg()
			},
			async resolve(parent, args, context) {
				if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
					throw new Error(`Permission denied`);
				}

				const lhdPeople = await context.prisma.Person.findMany({
					where: {
						OR: [
							{ name: { contains: args.search }},
							{ surname : { contains: args.search }},
						]
					}
				});
				const lhdPeopleTyped = lhdPeople.map(p => ({
						type: 'Person',
						name: p.name,
						surname: p.surname,
						email: p.email,
						sciper: p.sciper
					}));

				const filteredLdapUsers = [];
				if (!args.lhdOnly) {
					const ldapUsers = await getUsersFromApi(args.search);
					ldapUsers["persons"].forEach(u => {
						if (!lhdPeopleTyped.find(p => p.sciper == u.id)) {
							filteredLdapUsers.push({
								type: 'DirectoryPerson',
								surname: u.lastname,
								name: u.firstname,
								email: u.email,
								sciper: u.id
							});
						}
					});
				}
				return lhdPeopleTyped.concat(filteredLdapUsers);
			}
		})
	},
})

export const ConnectedUserInfoStruct = objectType({
	name: 'ConnectedUserInfo',
	definition(t) {
		t.list.string('groups');
		t.string('preferred_username');
		t.string('given_name');
		t.string('family_name');
	},
});

export const ConnectedUserInfoQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("connectedUserInfo", {
			type: "ConnectedUserInfo",
			async resolve(parent, args, context) {
				return {
					groups: context.user.groups,
					preferred_username: context.user.preferred_username,
					given_name: context.user.given_name,
					family_name: context.user.family_name
				};
			}
		})
	},
})
