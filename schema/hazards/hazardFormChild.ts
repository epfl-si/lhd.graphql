import {extendType, objectType, stringArg} from 'nexus';
import {mutationStatusType} from "../statuses";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {getSHA256} from "../../utils/HashingTools";
import {hazard_form_child} from "nexus-prisma";

export const HazardFormChildStruct = objectType({
	name: hazard_form_child.$name,
	description: `The list of hazards form child.`,

	definition(t) {
		t.nonNull.field(hazard_form_child.form);
		t.nonNull.field(hazard_form_child.version);
		t.nonNull.field(hazard_form_child.hazard_form_child_name);
		t.nonNull.field('parentForm', {
			type: "hazard_form",
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_form.findUnique({
					where: { id_hazard_form: parent.id_hazard_form },
				});
			},
		});
		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_hazard_form_child, obj: getHazardFormChildToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

function getHazardFormChildToString(parent) {
	return {
		id_hazard_form_child: parent.id_hazard_form_child,
		id_hazard_form: parent.id_hazard_form,
		hazard_form_child_name: parent.hazard_form_child_name,
		form: parent.form,
		version: parent.version
	};
}

export const HazardFormChildQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.hazardFormChildren({ filtering: true, ordering: true });
	},
});

const hazardFormChildChangesType = {
	id: stringArg(),
	form: stringArg(),
	version: stringArg(),
	hazard_form_child_name: stringArg(),
	category: stringArg()
};

export const HazardFormChildStatus = mutationStatusType({
	name: "HazardFormChildStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the Hazard Form Child mutation.`});
	}
});

export const HazardFormChildMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('createNewHazardFormChild', {
			description: `Create new hazard form child with his own form and version.`,
			args: hazardFormChildChangesType,
			type: "HazardFormChildStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						if (!context.user.groups.includes('LHD_acces_admin')) {
							throw new Error(`Only admins are allowed to update hazard form`);
						}
						if (!args.id) {
							throw new Error(`Not allowed to create a new hazard form child`);
						}
						const id: id = JSON.parse(args.id);
						if (id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to create a new hazard form child`);
						}

						let form = undefined;
						if (id.eph_id == 'NewHazardFormChild') {
							const category = await tx.hazard_category.findFirst({where: {hazard_category_name: args.category}});
							if (!category) {
								throw new Error(`Category ${args.category} not found`);
							}

							const hazardForm = await tx.hazard_form.findFirst({where: {id_hazard_category: category.id_hazard_category}});
							if (!hazardForm) {
								throw new Error(`Form not found for category ${args.category} not found`);
							}

							form = await tx.hazard_form_child.create(
								{ data: {
										form: args.form,
										version: args.version,
										hazard_form_child_name: args.hazard_form_child_name,
										id_hazard_form: hazardForm.id_hazard_form
									}
								});
							if ( !form ) {
								throw new Error(`Hazard form child not created.`);
							}

							const newFormChildHistory = await tx.hazard_form_child_history.create(
								{ data: {
										form: args.form,
										version: args.version,
										id_hazard_form_child: form.id_hazard_form_child,
										modified_by: context.user.preferred_username,
										modified_on: new Date()
									}
								});
							if ( !newFormChildHistory ) {
								throw new Error(`Hazard form not updated.`);
							}
						} else {
							throw new Error(`Not allowed to create a new hazard form child`);
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('updateHazardFormChild', {
			description: `Update form with a new version.`,
			args: hazardFormChildChangesType,
			type: "HazardFormStatus",
			async resolve(root, args, context) {
				try {
					return await context.prisma.$transaction(async (tx) => {
						if (!context.user.groups.includes('LHD_acces_admin')) {
							throw new Error(`Only admins are allowed to update hazard form`);
						}
						if (!args.id) {
							throw new Error(`Not allowed to update hazard form`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update hazard form`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const form = await tx.hazard_form_child.findUnique({where: {id_hazard_form_child: idDeobfuscated}});
						if (! form) {
							throw new Error(`Hazard form not found.`);
						}
						const hazardFormObject =  getSHA256(JSON.stringify(getHazardFormChildToString(form)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== hazardFormObject) {
							throw new Error(`Hazard form has been changed from another user. Please reload the page to make modifications`);
						}

						const updatedForm = await tx.hazard_form_child.update(
							{ where: { id_hazard_form_child: form.id_hazard_form_child },
								data: {
									form: args.form,
									version: args.version
								}
							});
						if ( !updatedForm ) {
							throw new Error(`Hazard form not updated.`);
						}
						const newFormHistory = await tx.hazard_form_child_history.create(
							{ data: {
									form: args.form,
									version: args.version,
									id_hazard_form_child: form.id_hazard_form_child,
									modified_by: context.user.preferred_username,
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

