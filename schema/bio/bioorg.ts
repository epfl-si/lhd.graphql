import {extendType, intArg, list, objectType, stringArg} from 'nexus';
import {bio_org} from 'nexus-prisma';
import {createNewMutationLog} from "../global/mutationLogs";
import {saveBase64File} from "../../utils/File";
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {updateBioOrg} from "../hazards/labHazardChild";

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

export const OrganismsFromFullTextQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("organismsFromFullText", {
			type: list("bio_org"),
			args: {
				search: stringArg(),
			},
			async resolve(parent, args, context) {
				return await context.prisma.bio_org.findMany({
					where: { organism: { contains: args.search } },
					orderBy: [
						{
							organism: 'asc',
						},
					]
				});
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
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						const organism = await tx.bio_org.create({
							data: {
								organism: args.organismName,
								risk_group: args.risk,
								updated_on: new Date(),
								updated_by: context.user.preferred_username
							}
						});

						if ( !organism ) {
							throw new Error(`Organism not created`);
						} else {
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
							await createNewMutationLog(tx, context, tx.bio_org.name, organism.id_bio_org, '', {}, organism, 'CREATE');
							await createNewMutationLog(tx, context, tx.bio_org.name, organism.id_bio_org, 'filePath', {}, {'filePath': filePath}, 'CREATE');
						}

						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('updateOrganism', {
			description: `Update organism details.`,
			args: newOrganismType,
			type: "OrganismStatus",
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to update organism`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update organism`);
						}

						if(!IDObfuscator.checkSalt(id)) {
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

						let filePath = org.filePath;
						if (args.fileContent != '' && args.fileName != '') {
							filePath = saveBase64File(args.fileContent,  'd_bio/' + org.id_bio_org + '/', args.fileName)
						}

						const updatedOrganism = await tx.bio_org.update(
							{ where: { id_bio_org: org.id_bio_org },
								data: {
									organism: args.organismName,
									risk_group: args.risk,
									updated_on: new Date(),
									updated_by: context.user.preferred_username,
									filePath: filePath
								}
							});

						if (!updatedOrganism) {
							throw new Error(`Organism ${args.organismName} not updated.`);
						} else {
							await createNewMutationLog(tx, context, tx.bio_org.name, updatedOrganism.id_bio_org, '', org, updatedOrganism, 'UPDATE');
							await updateBioOrg(org, updatedOrganism, tx, context);
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('deleteOrganism', {
			description: `Delete organism details.`,
			args: newOrganismType,
			type: "OrganismStatus",
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to delete organism`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to delete organism`);
						}

						if(!IDObfuscator.checkSalt(id)) {
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

						const deletedOrganism = await tx.bio_org.delete({ where: { id_bio_org: org.id_bio_org }});

						if ( !deletedOrganism ) {
							throw new Error(`Organism ${args.organismName} not deleted.`);
						} else {
							await createNewMutationLog(tx, context, tx.bio_org.name, 0, '', deletedOrganism, {}, 'DELETE');
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
