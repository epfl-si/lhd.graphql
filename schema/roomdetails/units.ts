import {booleanArg, extendType, inputObjectType, intArg, list, objectType, stringArg} from 'nexus';
import { Unit } from 'nexus-prisma';
import { InstituteStruct } from './institutes';
import {PersonStruct} from "../global/people";
import {Person, personType} from "@prisma/client";
import {mutationStatusType} from "../statuses";

export const UnitStruct = objectType({
	name: Unit.$name,
	description: `A lowest-rank organisational unit of EPFL.

Each EPFL lab (with exactly one Principal Investigator, or PI) is a Unit, as
is each lowest-level administrative division within central services.`,
	definition(t) {
		t.field(Unit.name);
		t.nonNull.field(Unit.id);
		t.field({
			...Unit.unitId,
			description: `The unit's 5-digit primary identifier in EPFL's information system (units.epfl.ch)`,
		});
		t.nonNull.field('institute', {
			type: InstituteStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.institute.findUnique({
					where: { id: parent.id_institute },
				});
			},
		});
		t.nonNull.list.nonNull.field('cosecs', {
			type: PersonStruct,
			resolve: async (parent, _, context) => {
				const unitsAndCosecs = await context.prisma.unit_has_cosec.findMany({
					where: { id_unit: (parent as any).id }});
				const cosecIDs = new Set(unitsAndCosecs.map((unitAndCosec) => unitAndCosec.id_person));
				return await context.prisma.Person.findMany({
					where: { id_person: { in: [...cosecIDs] }}
				})
			},
		});
		t.nonNull.list.nonNull.field('professors', {
			type: PersonStruct,
			resolve: async (parent, _, context) => {
				const unitsAndProfessors = await context.prisma.subunpro.findMany({
					where: { id_unit: (parent as any).id }});
				const profIDs = new Set(unitsAndProfessors.map((unitsAndProfessor) => unitsAndProfessor.id_person));
				return await context.prisma.Person.findMany({
					where: { id_person: { in: [...profIDs] }}
				})
			},
		});
		t.nonNull.list.nonNull.field('subUnits', {
			type: UnitStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.unit.findMany({
					where: {
						unitId: null,
						name: {
							startsWith: parent.name.concat(' ('),
						},
					}});
			},
		});
	},
});

export const UnitQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.units({ filtering: true });
	},
});

export const UnitStatus = mutationStatusType({
	name: "UnitStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the Unit mutation.`});
	}
});

export const PersonType = inputObjectType({
	name: "PersonType",
	definition(t) {
		t.nonNull.int('sciper');
		t.nonNull.string('name');
		t.nonNull.string('surname');
		t.string('type');
		t.string('email');
	}
})

export const UnitMutationType = inputObjectType({
	name: "UnitType",
	definition(t) {
		t.nonNull.string('name');
		t.nonNull.string('status');
	}
})

const PersonMutationType = inputObjectType({
	name: "PersonMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.nonNull.field('person', {type: "PersonType"});
	}
})

const unitChangesType = {
	profs: list(PersonMutationType),
	cosecs: list(PersonMutationType),
	subUnits: list(UnitMutationType),
	unit: stringArg()
};

const unitDeleteType = {
	unit: stringArg()
};

async function findOrCreatePerson(tx, person): Promise<Person> {
	let p = await tx.Person.findUnique({ where: { sciper: person.sciper }});

	if (!p) {
		try {
			p = await tx.Person.create({
				data: {
					name: person.name,
					surname: person.surname,
					sciper: person.sciper,
					email: person.email
				}
			});
		} catch ( e ) {
			p = undefined;
		}
	}
	return p;
}

export const UnitMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('updateUnit', {
			description: `Update unit details (profs, cosecs, sub-units).`,
			args: unitChangesType,
			type: "UnitStatus",
			async resolve(root, args, context) {
				const prisma = context.prisma;
				return await prisma.$transaction(async (tx) => {

					const unit = await tx.Unit.findFirst({ where: { name: args.unit }});

					if (unit) {
						const errors: string[] = [];
						try {
							if (args.profs.length>0) {
								for (const person of args.profs) {
									if (person.status == 'New') {
										const p: Person = await findOrCreatePerson(tx, person.person);
										if (p) {
											try {
												const subunpro = await tx.subunpro.create({
													data: {
														id_person: p.id_person,
														id_unit: unit.id
													}
												});
												if (!subunpro) {
													errors.push(`Relation not updated between ${unit.name} and ${person.person.sciper}.`)
												}
											} catch ( e ) {
												errors.push(`DB error: relation not updated between ${unit.name} and ${person.person.sciper}.`)
											}
										} else {
											errors.push(`Person ${person.person.sciper} not found.`)
										}
									}
									else if (person.status == 'Deleted') {
										let p = await tx.Person.findUnique({ where: { sciper: person.person.sciper }});
										if (p) {
											try {
												const del = await tx.subunpro.deleteMany({
													where: {
														id_unit: unit.id,
														id_person: p.id_person
													}
												});
												if (!del) {
													errors.push(`Relation unit-prof not deleted between ${unit.name} and ${person.person.sciper}.`)
												}
											} catch ( e ) {
												errors.push(`DB error: relation unit-prof not deleted between ${unit.name} and ${person.person.sciper}.`)
											}
										} else {
											errors.push(`Person ${person.person.sciper} not found.`)
										}
									}
								}
							}

							if (args.cosecs.length>0) {
								for (const person of args.cosecs) {
									if (person.status == 'New') {
										const p: Person = await findOrCreatePerson(tx, person.person);
										if (p) {
											try {
												const unitHasCosec = await tx.unit_has_cosec.create({
													data: {
														id_person: p.id_person,
														id_unit: unit.id
													}
												});
												if ( !unitHasCosec ) {
													errors.push(`Relation not update between ${unit.name} and ${person.person.sciper}.`)
												}
											} catch ( e ) {
												errors.push(`DB error: relation not update between ${unit.name} and ${person.person.sciper}.`)
											}
										} else {
											errors.push(`Person ${person.person.sciper} not found.`)
										}
									}
									else if (person.status == 'Deleted') {
										let p = await tx.Person.findUnique({ where: { sciper: person.person.sciper }});
										if (p) {
											try {
												const del = await tx.unit_has_cosec.deleteMany({
													where: {
														id_unit: unit.id,
														id_person: p.id_person
													}
												});
												if (!del) {
													errors.push(`Relation unit-cosec not deleted between ${unit.name} and ${person.person.sciper}.`)
												}
											} catch ( e ) {
												errors.push(`DB error: relation unit-cosec not deleted between ${unit.name} and ${person.person.sciper}.`)
											}
										} else {
											errors.push(`Person ${person.person.sciper} not found.`)
										}
									}
								}
							}

							if (args.subUnits.length>0) {
								for (const subunit of args.subUnits) {
									if (subunit.status == 'New') {
										try {
											const u = await tx.Unit.create({
												data: {
													name: subunit.name,
													id_institute: unit.id_institute
												}
											});
											if ( !u ) {
												errors.push(`Error creating sub-unit ${subunit.name}.`);
											}
										} catch ( e ) {
											errors.push(`Error creating sub-unit ${subunit.name}.`);
										}
									}
									else if (subunit.status == 'Deleted') {
										const u = await tx.Unit.findFirst({ where: { name: subunit.name }});
										if (u) {
											errors.concat(await deleteUnit(tx, u));
										} else {
											errors.push(`Error deleting sub-unit ${subunit.name}.`)
										}
									}
								}
							}
						} catch ( e ) {
							errors.push(`Error updating unit.`)
						}

						if (errors.length > 0) {
							return mutationStatusType.error(`${errors.join('\n')}`);
						} else {
							return mutationStatusType.success();
						}
					} else {
						return mutationStatusType.error(`Unit ${args.unit} not found.`)
					}
				});
			}
		});
		t.nonNull.field('deleteUnit', {
			description: `Delete unit details by unit name (profs, cosecs, sub-units).`,
			args: {
				...unitDeleteType
			},
			type: "UnitStatus",
			async resolve(root, args, context) {
				const prisma = context.prisma;
				return await prisma.$transaction(async (tx) => {
					const unit = await tx.Unit.findFirst({ where: { name: args.unit }});
					if (unit) {
						const errors: string[] = [];
						try {
							errors.concat(await deleteUnit(tx, unit));
						} catch ( e ) {
							errors.push(`Error updating unit.`)
						}

						if (errors.length > 0) {
							return mutationStatusType.error(`${errors.join('\n')}`);
						} else {
							return mutationStatusType.success();
						}
					} else {
						return mutationStatusType.error(`Unit ${args.unit} not found.`)
					}
				});
			}
		});
	}
});

async function deleteUnit(tx, u:Unit) {
	const errors: string[] = [];
	try {
		const uHc = await tx.unit_has_cosec.deleteMany({
			where: {
				id_unit: u.id,
			}
		});
		if ( uHc ) {
			errors.push(`Error deleting cosecs for ${u.name}.`);
		}
	} catch ( e ) {
		errors.push(`Error deleting cosecs for ${u.name}.`);
	}
	try {
		const uHr = await tx.unit_has_room.deleteMany({
			where: {
				id_unit: u.id,
			}
		});
		if ( uHr ) {
			errors.push(`Error deleting rooms for ${u.name}.`);
		}
	} catch ( e ) {
		errors.push(`Error deleting rooms for ${u.name}.`);
	}
	try {
		const sub = await tx.subunpro.deleteMany({
			where: {
				id_unit: u.id,
			},
		});
		if ( sub ) {
			errors.push(`Error deleting responsible for ${u.name}.`);
		}
	} catch ( e ) {
		errors.push(`Error deleting responsible for ${u.name}.`);
	}
	try {
		const unit = await tx.Unit.delete({
			where: {
				id: u.id,
			},
		});
		if ( unit ) {
			errors.push(`Error deleting ${u.name}.`);
		}
	} catch ( e ) {
		errors.push(`Error deleting ${u.name}.`);
	}
	return errors;
}

export const UnitFullTextQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("unitsFromFullText", {
			type: list("Unit"),
			args: {
				search: stringArg(),
			},
			async resolve(parent, args, context) {

				return await context.prisma.Unit.findMany({
					where: {
						OR: [
							{ name: { contains: args.search }},
							{ institute : { name: { contains: args.search } }},
							{ institute : { school: { name: { contains: args.search } } }},
						]
					}
				});
			}
		})
	},
})
