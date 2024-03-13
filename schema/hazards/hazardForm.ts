import {extendType, objectType, stringArg} from 'nexus';
import {hazard_form} from 'nexus-prisma';
import {HazardCategoryStruct} from "./hazardCategory";
import {mutationStatusType} from "../statuses";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";

export const HazardFormStruct = objectType({
	name: hazard_form.$name,
	description: `The list of hazards categories.`,

	definition(t) {
		t.nonNull.field(hazard_form.form);
		t.nonNull.field(hazard_form.version);
		t.nonNull.field('hazard_category', {
			type: HazardCategoryStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_category.findUnique({
					where: { id_hazard_category: parent.id_hazard_category}
				});
			},
		});
		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_hazard_form, obj: getHazardFormToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

function getHazardFormToString(parent) {
	return {
		id_hazard_form: parent.id_hazard_form,
		id_hazard_category: parent.id_hazard_category,
		form: parent.form,
		version: parent.version
	};
}

export const HazardFormQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.hazardForms({ filtering: true, ordering: true });
	},
});

const hazardFormChangesType = {
	id: stringArg(),
	form: stringArg(),
	version: stringArg(),
	hazard_category_name: stringArg()
};

export const HazardFormStatus = mutationStatusType({
	name: "HazardFormStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the Hazard Form mutation.`});
	}
});

export const HazardFormMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('createNewHazardCategory', {
			description: `Create new hazard category with his own form and version.`,
			args: hazardFormChangesType,
			type: "HazardFormStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update hazard form`);
						}

						let form = undefined;
						if (id.eph_id == 'newHazard') {
							const category = await tx.hazard_category.create(
								{ data: {
										hazard_category_name: args.hazard_category_name
									}
								});
							if ( !category ) {
								throw new Error(`Category ${args.hazard_category_name} not created.`);
							}
							form = await tx.hazard_form.create(
								{ data: {
										form: args.form,
										version: args.version,
										id_hazard_category: category.id_hazard_category
									}
								});
							if ( !form ) {
								throw new Error(`Hazard form not updated.`);
							}
						} else {
							if(!IDObfuscator.checkSalt(id)) {
								throw new Error(`Bad descrypted request`);
							}
							const idDeobfuscated = IDObfuscator.deobfuscateId(id);
							form = await tx.hazard_form.findUnique({where: {id_hazard_form: idDeobfuscated}});
							if (! form) {
								throw new Error(`Hazard form not found.`);
							}
							const hazardFormObject =  getSHA256(JSON.stringify(getHazardFormToString(form)), id.salt);
							if (IDObfuscator.getDataSHA256(id) !== hazardFormObject) {
								throw new Error(`Hazard form has been changed from another user. Please reload the page to make modifications`);
							}
							const updatedForm = await tx.hazard_form.update(
								{ where: { id_hazard_form: form.id_hazard_form },
									data: {
										form: args.form,
										version: args.version
									}
								});
							if ( !updatedForm ) {
								throw new Error(`Hazard form not updated.`);
							}
						}

						const newFormHistory = await tx.hazard_form_history.create(
							{ data: {
									form: args.form,
									version: args.version,
									id_hazard_form: form.id_hazard_form,
									modified_by: 'Rosa',
									modified_on: new Date()
								}
							});
						if ( !newFormHistory ) {
							throw new Error(`Hazard form not updated.`);
						}
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('updateForm', {
			description: `Update form with a new version.`,
			args: hazardFormChangesType,
			type: "HazardFormStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update hazard form`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const form = await tx.hazard_form.findUnique({where: {id_hazard_form: idDeobfuscated}});
						if (! form) {
							throw new Error(`Hazard form not found.`);
						}
						const hazardFormObject =  getSHA256(JSON.stringify(getHazardFormToString(form)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== hazardFormObject) {
							throw new Error(`Hazard form has been changed from another user. Please reload the page to make modifications`);
						}

						const updatedForm = await tx.hazard_form.update(
							{ where: { id_hazard_form: form.id_hazard_form },
								data: {
									form: args.form,
									version: args.version
								}
							});
						if ( !updatedForm ) {
							throw new Error(`Hazard form not updated.`);
						}
						const newFormHistory = await tx.hazard_form_history.create(
							{ data: {
									form: args.form,
									version: args.version,
									id_hazard_form: form.id_hazard_form,
									modified_by: 'Rosa',
									modified_on: new Date()
								}
							});
						if ( !newFormHistory ) {
							throw new Error(`Hazard form not updated.`);
						}
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
	}
});

