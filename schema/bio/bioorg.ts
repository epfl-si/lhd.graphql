import {extendType, intArg, list, objectType, stringArg} from 'nexus';
import {bio_org} from 'nexus-prisma';
import {createNewMutationLog} from "../global/mutationLogs";
import {saveBase64File} from "../../utils/File";
import {mutationStatusType} from "../statuses";

export const BioOrgStruct = objectType({
	name: bio_org.$name,
	description: `Biological entity.`,
	definition(t) {
		t.field(bio_org.organism);
		t.field(bio_org.risk_group);
		t.field(bio_org.filePath);
		t.field(bio_org.updated_on);
		t.field(bio_org.updated_by);
	},
});

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
	}
});
