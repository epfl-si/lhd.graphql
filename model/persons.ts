import {Person} from "@prisma/client";
import {getUsersFromApi} from "../utils/CallAPI";

export async function findOrCreatePerson(tx, sciperId, firstName, lastName, email): Promise<Person> {
	let p = await tx.Person.findUnique({ where: { sciper: sciperId }});

	if (!p) {
		p = await tx.Person.create({
			data: {
				name: firstName,
				surname: lastName,
				sciper: sciperId,
				email: email
			}
		});
	}
	return p;
}

export async function ensureNewHolders(holders, prisma) {
	const newHolders = holders.filter(holder => holder.status === 'New');
	for ( const holder of newHolders ) {
		let p = await prisma.Person.findUnique({where: {sciper: holder.sciper}});

		if ( !p ) {
			const ldapUsers = await getUsersFromApi(holder.sciper + "");
			const ldapUser = ldapUsers["persons"].find(p => p.id == holder.sciper + "");
			await prisma.$transaction(async (tx) => {
				await tx.Person.create({
					data: {
						surname: ldapUser.lastname,
						name: ldapUser.firstname,
						email: ldapUser.email,
						sciper: parseInt(ldapUser.id)
					}
				});
			});
		}
	}
}
