import {booleanArg, extendType, intArg, objectType, stringArg} from "nexus";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {auth_chem} from "nexus-prisma";
import {mutationStatusType} from "../statuses";
import {sendEmailsForChemical} from "../../utils/email/mailer";
import {createChemical, getChemicals} from "../../model/chemicals";
import {sanitizeSearchString} from "../../utils/searchStrings";
import {casRegexp, chemicalNameRegexp} from "../../api/lib/lhdValidators";
import {acceptInteger} from "../../utils/fieldValidatePlugin";

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
		t.nonNull.list.nonNull.field('chemicals', { type: 'auth_chem' });
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
				search: stringArg()
			},
			authorize: (parent, args, context) => context.user.canListChemicals,
			validate: {
				take: acceptInteger,
				skip: acceptInteger,
				search: (s) => sanitizeSearchString(s, {
					CAS: {rename: 'cas', validate: casRegexp},
					Name: {rename: 'name', validate: chemicalNameRegexp},
					Status: {rename: 'status', validate: (value) => {
						const keyword = ['active', 'archived'].find(status => status.includes(value.toLowerCase()));
						if (keyword === undefined) throw new Error("Neither active nor archived");
						return keyword === 'active';
					}}
				})
			},
			async resolve(parent, args, context) {
				return await getChemicals(context.prisma, {skip: args.skip, take: args.take, ...(args.search as any)});
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
			authorize: (parent, args, context) => context.user.canEditChemicals,
			async resolve(root, args, context) {
				await createChemical(args, context);
				return mutationStatusType.success();
			}
		});
		t.nonNull.field('updateChemical', {
			description: `Update chemical details.`,
			args: newChemicalType,
			type: "ChemicalStatus",
			authorize: (parent, args, context) => context.user.canEditChemicals,
			async resolve(root, args, context) {
				await context.prisma.$transaction(async (tx) => {
					const chem = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'auth_chem', 'id_auth_chem',
						tx, args.cas_auth_chem, getChemicalToString);

					await tx.auth_chem.update(
						{ where: { id_auth_chem: chem.id_auth_chem },
							data: {
								cas_auth_chem: args.cas_auth_chem,
								auth_chem_en: args.auth_chem_en,
								flag_auth_chem: args.flag_auth_chem
							}
						});
				});
				await sendEmailsForChemical(context.prisma, context.user.username);
				return mutationStatusType.success();
			}
		});
		t.nonNull.field('deleteChemical', {
			description: `Delete chemical details.`,
			args: newChemicalType,
			type: "ChemicalStatus",
			authorize: (parent, args, context) => context.user.canEditChemicals,
			async resolve(root, args, context) {
				await context.prisma.$transaction(async (tx) => {
					const chem = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'auth_chem', 'id_auth_chem',
						tx, args.cas_auth_chem, getChemicalToString);

					await tx.auth_chem_log.deleteMany({ where: { id_auth_chem: chem.id_auth_chem }});
					await tx.auth_rchem.deleteMany({ where: { id_auth_chem: chem.id_auth_chem }});
					await tx.auth_chem.delete({ where: { id_auth_chem: chem.id_auth_chem }});

					//TODO delete authorizations?
				});
				await sendEmailsForChemical(context.prisma, context.user.username);
				return mutationStatusType.success();
			}
		});
	}
});
