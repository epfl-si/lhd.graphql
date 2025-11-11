import {extendType, inputObjectType, intArg, list, objectType, stringArg} from 'nexus';
import {Unit} from 'nexus-prisma';
import {InstituteStruct} from './institutes';
import {PersonStruct} from "../global/people";
import {Person} from "@prisma/client";
import {mutationStatusType} from "../statuses";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";
import {getUnitsFromApi} from "../../utils/CallAPI";
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
		t.crud.units({ filtering: true,
			resolve: async (root, args, context, info, originalResolve) => {
				// Ensure user is authenticated
				if (!context.user) {
					throw new Error('Unauthorized');
				}

				// Check if user has the right to access rooms (customize this logic)
				if (!context.user.canListUnits) {
					throw new Error('Permission denied');
				}

				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
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

export const UnitMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('createUnit', {
			description: `Import a new unit from api.epfl.ch.`,
			args: unitCreationType,
			type: "UnitStatus",
			authorize: (parent, args, context) => context.user.canEditUnits,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					for (const unit of args.units) {
						if (unit.status == 'New') {
							const newUnit = await tx.Unit.findUnique({ where: { unitId: unit.unitId }});

							if (!newUnit) {
								const parts: string[] = unit.path.split(' ');
								const instituteName: string = parts[2];
								let institute = await tx.Institute.findFirst({where: { name: instituteName}});

								if (!institute) {
									const facultyName: string = parts[1];
									let faculty = await tx.School.findFirst({where: { name: facultyName}});

									if (!faculty) {
										faculty = await tx.School.create({
											data: {
												name: facultyName,
											}
										});
									}

									institute = await tx.Institute.create({
										data: {
											name: instituteName,
											id_school: faculty.id
										}
									});
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

								const newSubunpro = {
									id_person: responsible.id_person,
									id_unit: u.id
								};
								await tx.subunpro.create({
									data: newSubunpro
								});
							}
						}
					}
					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('updateUnit', {
			description: `Update unit details (profs, cosecs, sub-units).`,
			args: unitChangesType,
			type: "UnitStatus",
			authorize: (parent, args, context) => context.user.canEditUnits,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const id = IDObfuscator.getId(args.id);
					const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
					const unit = await tx.Unit.findUnique({where: {id: idDeobfuscated}});
					if (! unit) {
						throw new Error(`Unit ${args.unit} not found.`);
					}
					const unitObject =  getSHA256(JSON.stringify(getUnitToString(unit)), id.salt);
					if (IDObfuscator.getDataSHA256(id) !== unitObject) {
						throw new Error(`Unit ${args.unit} has been changed from another user. Please reload the page to make modifications`);
					}

					if (!unit.unitId) {
						await tx.Unit.update(
							{ where: { id: unit.id },
								data: {
									name: args.unit
								}
							});
					}

					for (const person of args.profs) {
						if (person.status == 'New') {
							const p: Person = await findOrCreatePerson(tx, context, person.person.sciper, person.person.name, person.person.surname, person.person.email);
							const newSubunpro = {
								id_person: p.id_person,
								id_unit: unit.id
							};
							await tx.subunpro.create({
								data: newSubunpro
							});
						}
						else if (person.status == 'Deleted') {
							let p = await tx.Person.findUnique({ where: { sciper: person.person.sciper }});
							if (!p) continue;
							const whereCondition = {
								id_unit: unit.id,
								id_person: p.id_person
							};
							await tx.subunpro.deleteMany({
								where: whereCondition
							});
						}
					}

					for (const person of args.cosecs) {
						if (person.status == 'New') {
							const p: Person = await findOrCreatePerson(tx, context, person.person.sciper, person.person.name, person.person.surname, person.person.email);
							const relationUnitCosec = {
								id_person: p.id_person,
								id_unit: unit.id
							};
							await tx.unit_has_cosec.create({
								data: relationUnitCosec
							});
						}
						else if (person.status == 'Deleted') {
							let p = await tx.Person.findUnique({ where: { sciper: person.person.sciper }});
							if (!p) continue;
							const whereCondition = {
								id_unit: unit.id,
								id_person: p.id_person
							};
							await tx.unit_has_cosec.deleteMany({
								where: whereCondition
							});
						}
					}

					for (const subunit of args.subUnits) {
						if (subunit.status == 'New') {
							await tx.Unit.create({
								data: {
									name: subunit.name,
									id_institute: unit.id_institute
								}
							});
						}
						else if (subunit.status == 'Deleted') {
							const u = await tx.Unit.findFirst({ where: { name: subunit.name }});
							if (u) await deleteUnit(tx, context, u);
						}
					}

					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('deleteUnit', {
			description: `Delete unit details by unit name (profs, cosecs, sub-units).`,
			args: unitDeleteType,
			type: "UnitStatus",
			authorize: (parent, args, context) => context.user.canEditUnits,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const id = IDObfuscator.getId(args.id);
					const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
					const unit = await tx.Unit.findUnique({where: {id: idDeobfuscated}});
					if (! unit) {
						throw new Error(`Unit not found.`);
					}
					const unitObject =  getSHA256(JSON.stringify(getUnitToString(unit)), id.salt);
					if (IDObfuscator.getDataSHA256(id) !== unitObject) {
						throw new Error(`Unit has been changed from another user. Please reload the page to make modifications`);
					}

					await deleteUnit(tx, context, unit)
					return mutationStatusType.success();
				});
			}
		});
	}
});

async function deleteUnit(tx, context, u:Unit) {
		await tx.aa.deleteMany({
			where: {
				id_unit: u.id,
			}
		});

		await tx.unit_has_cosec.deleteMany({
			where: {
				id_unit: u.id,
			}
		});

		await tx.unit_has_room.deleteMany({
			where: {
				id_unit: u.id,
			}
		});

		await tx.subunpro.deleteMany({
			where: {
				id_unit: u.id,
			},
		});

		await tx.unit_has_storage_for_room.deleteMany({
			where: {
				id_unit: u.id,
			},
		});

		const subUnitList = await tx.Unit.findMany({
			where: {
				name: { startsWith: u.name },
				id: { not: u.id }
			}
		});
		for await (const subUnit of subUnitList) {
			await deleteUnit(tx, context, subUnit);
		}

		await tx.Unit.delete({
			where: {
				id: u.id,
			},
		});
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
			authorize: (parent, args, context) => context.user.canListUnits,
			async resolve(parent, args, context) {
				const unitList = await context.prisma.Unit.findMany({
					where: {
						OR: [
							{ name: { contains: args.search }},
							{ institute : { name: { contains: args.search } }},
							{ institute : { school: { name: { contains: args.search } } }},
							{ unit_has_cosec: { some: { cosec: { name: { contains: args.search }}}}},
							{ unit_has_cosec: { some: { cosec: { surname: { contains: args.search }}}}},
							{ subunpro: { some: { person: { name: { contains: args.search }}}}},
							{ subunpro: { some: { person: { surname: { contains: args.search }}}}},
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
			authorize: (parent, args, context) => context.user.canListUnits,
			async resolve(parent, args, context) {
				return await getUnitByName(args, context);
			}
		})
	},
})

export async function getUnitByName(args, context) {
	return await context.prisma.Unit.findMany({
		where: {
			OR: [
				{ name: { contains: args.search }},
				{ institute : { name: { contains: args.search } }},
				{ institute : { school: { name: { contains: args.search } } }},
			]
		},
		include: { unit_has_cosec: { include: { cosec: true } }, subunpro: { include: { person: true } }, institute: { include: { school: true } }, unit_has_room: { include: true } },
		orderBy: [
			{
				name: 'asc',
			},
		]
	});
}

export async function getParentUnit(nameParent: string, context) {
	return await context.prisma.Unit.findMany({
		where: {name: nameParent},
		orderBy: [
			{
				name: 'asc',
			},
		]
	});
}
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
			authorize: (parent, args, context) => context.user.canListUnits,
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
			authorize: (parent, args, context) => context.user.canListUnits,
			async resolve(parent, args, context): Promise<any> {
				return await context.prisma.$transaction(async (tx) => {
					const ids = IDObfuscator.getId(args.id);
					const reportList = [];
					await Promise.all(ids.map(async (id) => {
						const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
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
			}
		})
	},
})
