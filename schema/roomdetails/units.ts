import {booleanArg, extendType, inputObjectType, intArg, list, objectType, stringArg} from 'nexus';
import { Unit } from 'nexus-prisma';
import { InstituteStruct } from './institutes';
import {PersonStruct} from "../global/people";
import {Person } from "@prisma/client";
import {mutationStatusType} from "../statuses";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";

export const UnitStruct = objectType({
	name: Unit.$name,
	description: `A lowest-rank organisational unit of EPFL.

Each EPFL lab (with exactly one Principal Investigator, or PI) is a Unit, as
is each lowest-level administrative division within central services.`,
	definition(t) {
		t.field(Unit.name);
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
		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id, obj: getUnitToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

function getUnitToString(parent) {
	return {
		id: parent.id,
		unitId: parent.unitId,
		name: parent.name,
		id_institute: parent.id_institute
	};
}

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
	id: stringArg(),
	profs: list(PersonMutationType),
	cosecs: list(PersonMutationType),
	subUnits: list(UnitMutationType),
	unit: stringArg()
};

const unitDeleteType = {
	id: stringArg()
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
				try {
					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to update unit`);
						}
						const id: id = JSON.parse(args.id);
						if (id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update unit`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const unit = await tx.Unit.findUnique({where: {id: idDeobfuscated}});
						if (! unit) {
							throw new Error(`Unit ${args.unit} not found.`);
						}
						const unitObject =  getSHA256(JSON.stringify(getUnitToString(unit)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== unitObject) {
							throw new Error(`Unit ${args.unit} has been changed from another user. Please reload the page to make modifications`);
						}

						const errors: string[] = [];
						try {
							for (const person of args.profs) {
								if (person.status == 'New') {
									const p: Person = await findOrCreatePerson(tx, person.person);
									if (!p) {
										errors.push(`Person ${person.person.sciper} not found.`);
										continue;
									}
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
								}
								else if (person.status == 'Deleted') {
									let p = await tx.Person.findUnique({ where: { sciper: person.person.sciper }});
									if (!p) {
										errors.push(`Person ${person.person.sciper} not found.`);
										continue;
									}
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
								}
							}

							for (const person of args.cosecs) {
								if (person.status == 'New') {
									const p: Person = await findOrCreatePerson(tx, person.person);
									if (!p) {
										errors.push(`Person ${person.person.sciper} not found.`);
										continue;
									}
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
								}
								else if (person.status == 'Deleted') {
									let p = await tx.Person.findUnique({ where: { sciper: person.person.sciper }});
									if (!p) {
										errors.push(`Person ${person.person.sciper} not found.`);
										continue;
									}
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
								}
							}

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
						} catch ( e ) {
							errors.push(`Error updating unit.`)
						}

						if (errors.length > 0) {
							throw new Error(`${errors.join('\n')}`);
						} else {
							return mutationStatusType.success();
						}
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('deleteUnit', {
			description: `Delete unit details by unit name (profs, cosecs, sub-units).`,
			args: unitDeleteType,
			type: "UnitStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to update unit`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to delete unit`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const unit = await tx.Unit.findUnique({where: {id: idDeobfuscated}});
						if (! unit) {
							throw new Error(`Unit not found.`);
						}
						const unitObject =  getSHA256(JSON.stringify(getUnitToString(unit)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== unitObject) {
							throw new Error(`Unit has been changed from another user. Please reload the page to make modifications`);
						}

						const errors: string[] = [];
						try {
							errors.concat(await deleteUnit(tx, unit));
						} catch ( e ) {
							errors.push(`Error updating unit.`)
						}

						if (errors.length > 0) {
							throw new Error(`${errors.join('\n')}`);
						} else {
							return mutationStatusType.success();
						}
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
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

export const UnitsWithPaginationStruct = objectType({
	name: 'UnitsWithPagination',
	definition(t) {
		t.list.field('units', { type: 'Unit' });
		t.int('totalCount');
	},
});

export const UnitFullTextQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("unitsFromFullText", {
			type: "UnitsWithPagination",
			args: {
				skip: intArg({ default: 0 }),
				take: intArg({ default: 20 }),
				search: stringArg(),
			},
			async resolve(parent, args, context) {

				const unitList = await context.prisma.Unit.findMany({
					where: {
						OR: [
							{ name: { contains: args.search }},
							{ institute : { name: { contains: args.search } }},
							{ institute : { school: { name: { contains: args.search } } }},
						]
					}
				});

				const units = unitList.slice(args.skip, args.skip + args.take);
				const totalCount = unitList.length;

				return { units, totalCount };
			}
		})
	},
})
