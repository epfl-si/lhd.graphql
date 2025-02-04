import {extendType, inputObjectType, intArg, list, objectType, stringArg} from 'nexus';
import {Unit} from 'nexus-prisma';
import {InstituteStruct} from './institutes';
import {PersonStruct} from "../global/people";
import {Person} from "@prisma/client";
import {mutationStatusType} from "../statuses";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";
import {getUnitsFromApi} from "../../utils/CallAPI";
import {createNewMutationLog} from "../global/mutationLogs";
import * as path from "node:path";
import * as fs from "fs";

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
		t.field('responsible', {
			type: PersonStruct,
			resolve: async (parent, _, context) => {
				if (parent.responsible_id)
					return await context.prisma.person.findUnique({
						where: {
							id_person: parent.responsible_id
						}});
			},
		});
		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id, obj: getUnitToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});

		t.string('unitType',  {
			resolve: async (parent, _, context) => {
				const units = await getUnitsFromApi(parent.name);
				return (units && units["units"].length > 0 && units["units"][0].unittype) ? units["units"][0].unittype.label : '';
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

export const UnitCreationType = inputObjectType({
	name: "UnitCreationType",
	definition(t) {
		t.nonNull.string('name');
		t.nonNull.string('path');
		t.nonNull.int('unitId');
		t.int('responsibleId');
		t.string('responsibleFirstName');
		t.string('responsibleLastName');
		t.string('responsibleEmail');
		t.nonNull.string('status');
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
});

const unitCreationType = {
	units: list(UnitCreationType)
};

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

async function findOrCreatePerson(tx, context, sciperId, firstName, lastName, email): Promise<Person> {
	let p = await tx.Person.findUnique({ where: { sciper: sciperId }});

	if (!p) {
		try {
			p = await tx.Person.create({
				data: {
					name: firstName,
					surname: lastName,
					sciper: sciperId,
					email: email
				}
			});

			if (p) {
				await createNewMutationLog(tx, context, tx.Person.name, p.id_person, '', {}, p, 'CREATE');
			}
		} catch ( e ) {
			p = undefined;
		}
	}
	return p;
}

export const UnitMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('createUnit', {
			description: `Import a new unit from api.epfl.ch.`,
			args: unitCreationType,
			type: "UnitStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						const errors: string[] = [];
						for (const unit of args.units) {
							if (unit.status == 'New') {
								const newUnit = await tx.Unit.findUnique({ where: { unitId: unit.unitId }});

								if (!newUnit) {
									const parts: string[] = unit.path.split(' ');
									const instituteName: string = parts[2];
									let institute = await tx.Institute.findFirst({where: { name: instituteName}});

									if(!institute) {
										const facultyName: string = parts[1];
										let faculty = await tx.School.findFirst({where: { name: facultyName}});

										if(!faculty) {
											faculty = await tx.School.create({
												data: {
													name: facultyName,
												}
											});
											if (faculty) {
												await createNewMutationLog(tx, context, tx.School.name, faculty.id, '', {},	faculty, 'CREATE');
											}
										}

										institute = await tx.Institute.create({
											data: {
												name: instituteName,
												id_school: faculty.id
											}
										});
										if (institute) {
											await createNewMutationLog(tx, context, tx.Institute.name, institute.id, '', {}, institute, 'CREATE');
										}
									}

									const responsible: Person = await findOrCreatePerson(tx, context,  unit.responsibleId, unit.responsibleFirstName, unit.responsibleLastName, unit.responsibleEmail);

									const u = await tx.Unit.create({
										data: {
											name: unit.name,
											unitId: unit.unitId,
											id_institute: institute.id,
											responsible_id: responsible?.id_person
										}
									});

									if (u) {
										if (!responsible) {
											errors.push(`Sciper ${unit.responsibleId} not found.`);
										} else {
											try {
												const newSubunpro = {
													id_person: responsible.id_person,
													id_unit: u.id
												};
												const subunpro = await tx.subunpro.create({
													data: newSubunpro
												});
												if (!subunpro) {
													errors.push(`Relation not updated between unit ${unit.name} and sciper ${unit.responsibleId}.`)
												} else {
													await createNewMutationLog(tx, context, tx.subunpro.name, 0, '', {}, newSubunpro, 'CREATE');
												}
											} catch ( e ) {
												errors.push(`DB error: relation not updated between unit ${unit.name} and sciper ${unit.responsibleId}.`)
											}
										}
										await createNewMutationLog(tx, context, tx.Unit.name, u.id_unit, '', {}, u, 'CREATE');
									}
								}
							}
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
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
									const p: Person = await findOrCreatePerson(tx, context, person.person.sciper, person.person.name, person.person.surname, person.person.email);
									if (!p) {
										errors.push(`Person ${person.person.sciper} not found.`);
										continue;
									}
									try {
										const newSubunpro = {
											id_person: p.id_person,
											id_unit: unit.id
										};
										const subunpro = await tx.subunpro.create({
											data: newSubunpro
										});
										if (!subunpro) {
											errors.push(`Relation not updated between ${unit.name} and ${person.person.sciper}.`)
										} else {
											await createNewMutationLog(tx, context, tx.subunpro.name, 0, '', {}, newSubunpro, 'CREATE');
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
										const whereCondition = {
											id_unit: unit.id,
											id_person: p.id_person
										};
										const del = await tx.subunpro.deleteMany({
											where: whereCondition
										});
										if (!del) {
											errors.push(`Relation unit-prof not deleted between ${unit.name} and ${person.person.sciper}.`)
										} else {
											await createNewMutationLog(tx, context, tx.subunpro.name, 0,'', whereCondition, {}, 'DELETE');
										}
									} catch ( e ) {
										errors.push(`DB error: relation unit-prof not deleted between ${unit.name} and ${person.person.sciper}.`)
									}
								}
							}

							for (const person of args.cosecs) {
								if (person.status == 'New') {
									const p: Person = await findOrCreatePerson(tx, context, person.person.sciper, person.person.name, person.person.surname, person.person.email);
									if (!p) {
										errors.push(`Person ${person.person.sciper} not found.`);
										continue;
									}
									try {
										const relationUnitCosec = {
											id_person: p.id_person,
											id_unit: unit.id
										};
										const unitHasCosec = await tx.unit_has_cosec.create({
											data: relationUnitCosec
										});
										if ( !unitHasCosec ) {
											errors.push(`Relation not update between ${unit.name} and ${person.person.sciper}.`)
										} else {
											await createNewMutationLog(tx, context, tx.unit_has_cosec.name, 0,'', {}, relationUnitCosec, 'CREATE');
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
										const whereCondition = {
											id_unit: unit.id,
											id_person: p.id_person
										};
										const del = await tx.unit_has_cosec.deleteMany({
											where: whereCondition
										});
										if (!del) {
											errors.push(`Relation unit-cosec not deleted between ${unit.name} and ${person.person.sciper}.`)
										} else if (del.count > 0) {
											await createNewMutationLog(tx, context, tx.unit_has_cosec.name, 0,'', whereCondition, {}, 'DELETE');
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
										} else {
											await createNewMutationLog(tx, context, tx.Unit.name, u.id_unit, '', {}, u, 'CREATE');
										}
									} catch ( e ) {
										errors.push(`Error creating sub-unit ${subunit.name}.`);
									}
								}
								else if (subunit.status == 'Deleted') {
									const u = await tx.Unit.findFirst({ where: { name: subunit.name }});
									if (u) {
										errors.concat(await deleteUnit(tx, context, u));
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
							errors.concat(await deleteUnit(tx, context, unit));
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

async function deleteUnit(tx, context, u:Unit) {
	const errors: string[] = [];
	try {
		const uHc = await tx.unit_has_cosec.deleteMany({
			where: {
				id_unit: u.id,
			}
		});
		if ( !uHc ) {
			errors.push(`Error deleting cosecs for ${u.name}.`);
		} else if (uHc.count > 0) {
			await createNewMutationLog(tx, context, tx.unit_has_cosec.name, 0,'', {name: u.name, id: u.id}, {}, 'DELETE');
		}
		const uHr = await tx.unit_has_room.deleteMany({
			where: {
				id_unit: u.id,
			}
		});
		if ( !uHr ) {
			errors.push(`Error deleting rooms for ${u.name}.`);
		} else if(uHr.count > 0) {
			await createNewMutationLog(tx, context, tx.unit_has_room.name, 0, '', {name: u.name, id: u.id}, {}, 'DELETE');
		}
		const sub = await tx.subunpro.deleteMany({
			where: {
				id_unit: u.id,
			},
		});
		if ( !sub ) {
			errors.push(`Error deleting responsible for ${u.name}.`);
		} else if(sub.count > 0) {
			await createNewMutationLog(tx, context, tx.subunpro.name, 0, '', {name: u.name, id: u.id}, {}, 'DELETE');
		}
		const storages = await tx.unit_has_storage_for_room.deleteMany({
			where: {
				id_unit: u.id,
			},
		});
		if ( !storages ) {
			errors.push(`Error deleting ${u.name}.`);
		} else if(storages.count > 0) {
			await createNewMutationLog(tx, context, tx.unit_has_storage_for_room.name, 0, '', {name: u.name, id: u.id}, {}, 'DELETE');
		}
		const subUnitList = await tx.Unit.findMany({
			where: {
				name: { startsWith: u.name },
				id: { not: u.id }
			}
		});
		for await (const subUnit of subUnitList) {
			await deleteUnit(tx, context, subUnit);
		}
		const unit = await tx.Unit.delete({
			where: {
				id: u.id,
			},
		});
		if ( !unit ) {
			errors.push(`Error deleting ${u.name}.`);
		} else {
			await createNewMutationLog(tx, context, tx.Unit.name, 0, '', unit, {}, 'DELETE');
		}
	} catch ( e ) {
		errors.push(`Error deleting ${u.name}: ${e.message}.`);
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
		t.field("unitsFromFullTextAndPagination", {
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
					},
					orderBy: [
						{
							name: 'asc',
						},
					]
				});

				const units = unitList.slice(args.skip, args.skip + args.take);
				const totalCount = unitList.length;

				return { units, totalCount };
			}
		});
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

export const UnitFromAPI = objectType({
	name: "UnitFromAPI",
	definition(t) {
		t.string("name");
		t.string("path");
		t.string("unitId");
		t.string("responsibleId");
		t.string("responsibleFirstName");
		t.string("responsibleLastName");
		t.string("responsibleEmail");
	}
})

export const UnitFromAPIQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("unitsFromAPI", {
			type: list("UnitFromAPI"),
			args: {
				search: stringArg()
			},
			async resolve(parent, args, context): Promise<any> {
				const units = await getUnitsFromApi(args.search);
				const unitList = [];
				units["units"].forEach(u =>
				{
					unitList.push({
						name: u.name,
						path: u.path,
						unitId: u.id,
						responsibleId: u.responsibleid,
						responsibleFirstName: u.responsible.firstname,
						responsibleLastName: u.responsible.lastname,
						responsibleEmail: u.responsible.email

					});
				});
				return unitList;
			}
		})
	},
})


export const UnitReportFiles = objectType({
	name: "UnitReportFiles",
	definition(t) {
		t.string("name");
		t.string("path");
		t.string("unitName");
	}
})

export const UnitReportFilesQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("unitReportFiles", {
			type: list("UnitReportFiles"),
			args: {
				id: stringArg()
			},
			async resolve(parent, args, context): Promise<any> {
				try {
					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to update unit`);
						}
						const ids: id[] = JSON.parse(args.id);
						const reportList = [];
						await Promise.all(ids.map(async (id) => {
							if (id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
								throw new Error(`Not allowed to update unit`);
							}

							if(!IDObfuscator.checkSalt(id)) {
								throw new Error(`Bad descrypted request`);
							}

							const idDeobfuscated = IDObfuscator.deobfuscateId(id);
							const reportFolder = "report_audits/pdf/" + idDeobfuscated + "/";
							const folderPath = process.env.DOCUMENTS_PATH + "/" + reportFolder;
							if (fs.existsSync(folderPath)) {
								const files = fs.readdirSync(folderPath);
								const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
								const unit = await tx.Unit.findUnique({where: {id: idDeobfuscated}});
								if (! unit) {
									throw new Error(`Unit not found.`);
								}
								const fileList = [];
								pdfFiles.forEach(file =>
								{
									fileList.push({
										name: path.basename(file),
										path: reportFolder + file,
										unitName: unit.name
									});
								});
								reportList.push(fileList);
							}
						}));
						return reportList.flat();
					});
				} catch ( e ) {
					throw new Error(`Error during fetch reports`);
				}
			}
		})
	},
})
