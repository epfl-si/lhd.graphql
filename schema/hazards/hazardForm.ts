import {extendType, objectType, stringArg} from 'nexus';
import {hazard_form} from 'nexus-prisma';
import {HazardCategoryStruct} from "./hazardCategory";
import {mutationStatusType} from "../statuses";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";
import {HazardFormChildStruct} from "./hazardFormChild";

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
		t.nonNull.list.nonNull.field('children', {
			type: HazardFormChildStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_form_child.findMany({
					where: { id_hazard_form: (parent as any).id_hazard_form }});
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
		t.crud.hazardForms({ filtering: true, ordering: true,
			resolve: async (root, args, context, info, originalResolve) => {
				// Ensure user is authenticated
				if (!context.user) {
					throw new Error('Unauthorized');
				}

				// Check if user has the right to access rooms (customize this logic)
				if (!context.user.isAdmin) {
					throw new Error('Permission denied');
				}

				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
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
			authorize: (parent, args, context) => context.user.isAdmin,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const id = IDObfuscator.getId(args.id);
					if (id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
						throw new Error(`Not allowed to update hazard form`);
					}

					let form = undefined;
					if (id.eph_id == 'newHazard') {
						const category = await tx.hazard_category.create(
							{ data: {
									hazard_category_name: args.hazard_category_name
								}
							});
						form = await tx.hazard_form.create(
							{ data: {
									form: args.form,
									version: args.version,
									id_hazard_category: category.id_hazard_category
								}
							});
					} else {
						if (!IDObfuscator.checkSalt(id)) {
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
						await tx.hazard_form.update(
							{ where: { id_hazard_form: form.id_hazard_form },
								data: {
									form: args.form,
									version: args.version
								}
							});
					}

					await tx.hazard_form_history.create(
						{ data: {
								form: args.form,
								version: args.version,
								id_hazard_form: form.id_hazard_form,
								modified_by: context.user.preferred_username,
								modified_on: new Date()
							}
						});
					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('updateForm', {
			description: `Update form with a new version.`,
			args: hazardFormChangesType,
			type: "HazardFormStatus",
			authorize: (parent, args, context) => context.user.isAdmin,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const id = IDObfuscator.getId(args.id);
					const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
					const form = await tx.hazard_form.findUnique({where: {id_hazard_form: idDeobfuscated}});
					if (! form) {
						throw new Error(`Hazard form not found.`);
					}
					const hazardFormObject =  getSHA256(JSON.stringify(getHazardFormToString(form)), id.salt);
					if (IDObfuscator.getDataSHA256(id) !== hazardFormObject) {
						throw new Error(`Hazard form has been changed from another user. Please reload the page to make modifications`);
					}

					await tx.hazard_form.update(
						{ where: { id_hazard_form: form.id_hazard_form },
							data: {
								form: args.form,
								version: args.version
							}
						});
					await tx.hazard_form_history.create(
						{ data: {
								form: args.form,
								version: args.version,
								id_hazard_form: form.id_hazard_form,
								modified_by: context.user.preferred_username,
								modified_on: new Date()
							}
						});
					return mutationStatusType.success();
				});
			}
		});
	}
});

