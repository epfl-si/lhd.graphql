import {booleanArg, extendType, intArg, objectType, stringArg} from "nexus";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {auth_chem} from "nexus-prisma";
import {mutationStatusType} from "../statuses";
import {createNewMutationLog} from "../global/mutationLogs";
import {getSHA256} from "../../utils/HashingTools";

export const ChemicalStruct = objectType({
	name: auth_chem.$name,
	description: `Chemical authorization entity.`,
	definition(t) {
		t.field(auth_chem.cas_auth_chem);
		t.field(auth_chem.auth_chem_en);
		t.field(auth_chem.auth_chem_fr);
		t.field(auth_chem.flag_auth_chem);
		t.field(auth_chem.fastway);
		t.field(auth_chem.auth_code);
		t.string('id', {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_auth_chem, obj: getChemicalToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

function getChemicalToString(parent) {
	return {
		id: parent.id_auth_chem,
		cas_auth_chem: parent.cas_auth_chem,
		auth_chem_en: parent.auth_chem_en,
		auth_chem_fr: parent.auth_chem_fr,
		flag_auth_chem: parent.flag_auth_chem,
		fastway: parent.fastway,
		auth_code: parent.auth_code
	};
}

export const ChemicalQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.authChems({ filtering: true });
	},
});

export const ChemicalsWithPaginationStruct = objectType({
	name: 'ChemicalsWithPagination',
	definition(t) {
		t.list.field('chemicals', { type: 'auth_chem' });
		t.int('totalCount');
	},
});

export const ChemicalsWithPaginationQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("chemicalsWithPagination", {
			type: "ChemicalsWithPagination",
			args: {
				skip: intArg({ default: 0 }),
				take: intArg({ default: 20 }),
				search: stringArg(),
			},
			async resolve(parent, args, context) {
				if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
					throw new Error(`Permission denied`);
				}
				const queryArray = args.search.split("&");
				const dictionary = queryArray.map(query => query.split("="));
				const whereCondition = [];
				if (dictionary.length == 0) {
					whereCondition.push({ cas_auth_chem: { contains: '' }})
				} else {
					dictionary.forEach(query => {
						const value = decodeURIComponent(query[1]);
						if (query[0] == 'CAS') {
							whereCondition.push({ cas_auth_chem: { contains: value }})
						} else if (query[0] == 'Name') {
							whereCondition.push({ auth_chem_en : { contains: value }})
						} else if (query[0] == 'Status') {
							whereCondition.push({ flag_auth_chem : value == 'Active' })
						}
					})
				}

				const chemicalList = await context.prisma.auth_chem.findMany({
					where: {
						AND: whereCondition
					},
					orderBy: [
						{
							cas_auth_chem: 'asc',
						},
					]
				});

				const chemicals = args.take == 0 ? chemicalList : chemicalList.slice(args.skip, args.skip + args.take);
				const totalCount = chemicalList.length;

				return { chemicals, totalCount };
			}
		});
	},
});

const newChemicalType = {
	id: stringArg(),
	cas_auth_chem: stringArg(),
	auth_chem_en: stringArg(),
	flag_auth_chem: booleanArg()
};

export const ChemicalStatus = mutationStatusType({
	name: "ChemicalStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the chemical mutation.`});
	}
});

export const ChemicalMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('addChemical', {
			description: `Add a new chemical`,
			args: newChemicalType,
			type: "ChemicalStatus",
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						const chemical = await tx.auth_chem.create({
							data: {
								cas_auth_chem: args.cas_auth_chem,
								auth_chem_en: args.auth_chem_en,
								flag_auth_chem: args.flag_auth_chem
							}
						});

						if ( !chemical ) {
							throw new Error(`Chemical not created`);
						} else {
							await createNewMutationLog(tx, context, tx.auth_chem.name, chemical.id_auth_chem, '', {}, chemical, 'CREATE');
						}

						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('updateChemical', {
			description: `Update chemical details.`,
			args: newChemicalType,
			type: "ChemicalStatus",
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to update chemical`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update chemical`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const chem = await tx.auth_chem.findUnique({where: {id_auth_chem: idDeobfuscated}});
						if (! chem) {
							throw new Error(`Chemical ${args.cas_auth_chem} not found.`);
						}
						const chemicalObject =  getSHA256(JSON.stringify(getChemicalToString(chem)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== chemicalObject) {
							throw new Error(`Chemical ${args.cas_auth_chem} has been changed from another user. Please reload the page to make modifications`);
						}

						const updatedChemical = await tx.auth_chem.update(
							{ where: { id_auth_chem: chem.id_auth_chem },
								data: {
									cas_auth_chem: args.cas_auth_chem,
									auth_chem_en: args.auth_chem_en,
									flag_auth_chem: args.flag_auth_chem
								}
							});

						if (!updatedChemical) {
							throw new Error(`Chemical ${args.cas_auth_chem} not updated.`);
						} else {
							await createNewMutationLog(tx, context, tx.auth_chem.name, updatedChemical.id_auth_chem, '', chem, updatedChemical, 'UPDATE');
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('deleteChemical', {
			description: `Delete chemical details.`,
			args: newChemicalType,
			type: "ChemicalStatus",
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to delete chemical`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to delete chemical`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const chem = await tx.auth_chem.findUnique({where: {id_auth_chem: idDeobfuscated}});
						if (! chem) {
							throw new Error(`Chemical ${args.cas_auth_chem} not found.`);
						}
						const chemicalObject =  getSHA256(JSON.stringify(getChemicalToString(chem)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== chemicalObject) {
							throw new Error(`Chemical ${args.cas_auth_chem} has been changed from another user. Please reload the page to make modifications`);
						}

						await tx.auth_chem_log.deleteMany({ where: { id_auth_chem: chem.id_auth_chem }});
						await tx.auth_rchem.deleteMany({ where: { id_auth_chem: chem.id_auth_chem }});
						const deletedChemical = await tx.auth_chem.delete({ where: { id_auth_chem: chem.id_auth_chem }});

						//TODO delete authorizations?
						if ( !deletedChemical ) {
							throw new Error(`Chemical ${args.cas_auth_chem} not deleted.`);
						} else {
							await createNewMutationLog(tx, context, tx.auth_chem.name, 0, '', deletedChemical, {}, 'DELETE');
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
	}
});
