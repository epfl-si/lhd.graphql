import {Person} from "@prisma/client";

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
