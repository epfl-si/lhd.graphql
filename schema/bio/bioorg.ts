import {extendType, intArg, list, objectType, stringArg} from 'nexus';
import {bio_org} from 'nexus-prisma';
import {saveBase64File} from "../../utils/File";
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {updateBioOrg} from "../hazards/labHazardChild";
import {getUserInfoFromAPI} from "../../utils/CallAPI";

export const BioOrgStruct = objectType({
	name: bio_org.$name,
	description: `Biological entity.`,
	definition(t) {
		t.field(bio_org.organism);
		t.field(bio_org.risk_group);
		t.field(bio_org.filePath);
		t.field(bio_org.updated_on);
		t.field(bio_org.updated_by);
		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_bio_org, obj: getBioOrgToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

function getBioOrgToString(parent) {
	return {
		id: parent.id_bio_org,
		organism: parent.organism,
		risk_group: parent.risk_group,
		filePath: parent.filePath
	};
}

export const BioOrgQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.bioOrgs({ filtering: true });
	},
});

export const BiosWithPaginationStruct = objectType({
	name: 'BiosWithPagination',
	definition(t) {
		t.list.field('bios', { type: 'bio_org' });
		t.int('totalCount');
	},
});

export const OrganismsFromFullTextQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("organismsFromFullText", {
			type: "BiosWithPagination",
			args: {
				search: stringArg(),
				skip: intArg({ default: 0 }),
				take: intArg({ default: 20 })
			},
			authorize: (parent, args, context) => context.user.canListOrganisms,
			async resolve(parent, args, context) {
				const bioList =  await context.prisma.bio_org.findMany({
					where: { organism: { contains: args.search } },
					orderBy: [
						{
							organism: 'asc',
						},
					]
				});

				const bios = args.take == 0 ? bioList : bioList.slice(args.skip, args.skip + args.take);
				const totalCount = bioList.length;

				return { bios, totalCount };
			}
		})
	},
})

const newOrganismType = {
	id: stringArg(),
	organismName: stringArg(),
	risk: intArg(),
	fileContent: stringArg(),
	fileName: stringArg()
};

export const OrganismStatus = mutationStatusType({
	name: "OrganismStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the organism mutation.`});
	}
});

export const OrganismMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('addOrganism', {
			description: `Add a new organism`,
			args: newOrganismType,
			type: "OrganismStatus",
			authorize: (parent, args, context) => context.user.canEditOrganisms,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const userInfo = await getUserInfoFromAPI(context.user.preferred_username);
					const organism = await tx.bio_org.create({
						data: {
							organism: args.organismName,
							risk_group: args.risk,
							updated_on: new Date(),
							updated_by: `${userInfo.userFullName} (${userInfo.sciper})`,
						}
					});

					let filePath = '';
					if (args.fileContent != '' && args.fileName != '') {
						filePath = saveBase64File(args.fileContent,  'd_bio/' + organism.id_bio_org + '/', args.fileName)
					}
					await tx.bio_org.update({
						data: {
							filePath: filePath
						},
						where: {
							id_bio_org: organism.id_bio_org
						}
					});

					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('updateOrganism', {
			description: `Update organism details.`,
			args: newOrganismType,
			type: "OrganismStatus",
			authorize: (parent, args, context) => context.user.canEditOrganisms,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const id = IDObfuscator.getId(args.id);
					const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
					const org = await tx.bio_org.findUnique({where: {id_bio_org: idDeobfuscated}});
					if (! org) {
						throw new Error(`Organism ${args.organismName} not found.`);
					}
					const organismObject =  getSHA256(JSON.stringify(getBioOrgToString(org)), id.salt);
					if (IDObfuscator.getDataSHA256(id) !== organismObject) {
						throw new Error(`Organism ${args.organismName} has been changed from another user. Please reload the page to make modifications`);
					}

					let filePath = org.filePath;
					if (args.fileContent != '' && args.fileName != '') {
						filePath = saveBase64File(args.fileContent,  'd_bio/' + org.id_bio_org + '/', args.fileName)
					}

					const userInfo = await getUserInfoFromAPI(context.user.preferred_username);
					const updatedOrganism = await tx.bio_org.update(
						{ where: { id_bio_org: org.id_bio_org },
							data: {
								organism: args.organismName,
								risk_group: args.risk,
								updated_on: new Date(),
								updated_by: `${userInfo.userFullName} (${userInfo.sciper})`,
								filePath: filePath
							}
						});

					await updateBioOrg(org, updatedOrganism, tx, context);
					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('deleteOrganism', {
			description: `Delete organism details.`,
			args: newOrganismType,
			type: "OrganismStatus",
			authorize: (parent, args, context) => context.user.canEditOrganisms,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					if (!args.id) {
						throw new Error(`Not allowed to delete organism`);
					}
					const id: id = JSON.parse(args.id);
					if (id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
						throw new Error(`Not allowed to delete organism`);
					}

					if (!IDObfuscator.checkSalt(id)) {
						throw new Error(`Bad descrypted request`);
					}
					const idDeobfuscated = IDObfuscator.deobfuscateId(id);
					const org = await tx.bio_org.findUnique({where: {id_bio_org: idDeobfuscated}});
					if (! org) {
						throw new Error(`Organism ${args.organismName} not found.`);
					}
					const organismObject =  getSHA256(JSON.stringify(getBioOrgToString(org)), id.salt);
					if (IDObfuscator.getDataSHA256(id) !== organismObject) {
						throw new Error(`Organism ${args.organismName} has been changed from another user. Please reload the page to make modifications`);
					}

					await tx.bio_org_lab.deleteMany({ where: { id_bio_org: org.id_bio_org }});
					await tx.bio_org.delete({ where: { id_bio_org: org.id_bio_org }});

					return mutationStatusType.success();
				});
			}
		});
	}
});
