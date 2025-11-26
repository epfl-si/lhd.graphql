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
		t.crud.hazardFormChildren({ filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.isAdmin,
			resolve: async (root, args, context, info, originalResolve) => {
				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
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
			authorize: (parent, args, context) => context.user.isAdmin,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					if (!args.id) {
						throw new Error(`Not allowed to create a new hazard form child`);
					}
					const id: id = JSON.parse(args.id);
					IDObfuscator.checkId(id);
					let form = undefined;
					if (id.eph_id === 'NewHazardFormChild') {
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

						await tx.hazard_form_child_history.create(
							{ data: {
									form: args.form,
									version: args.version,
									id_hazard_form_child: form.id_hazard_form_child,
									modified_by: context.user.username,
									modified_on: new Date()
								}
							});
					} else {
						throw new Error(`Not allowed to create a new hazard form child`);
					}
					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('updateHazardFormChild', {
			description: `Update form with a new version.`,
			args: hazardFormChildChangesType,
			type: "HazardFormStatus",
			authorize: (parent, args, context) => context.user.isAdmin,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const form = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'hazard_form_child', 'id_hazard_form_child',
						tx, 'Hazard', getHazardFormChildToString);

					await tx.hazard_form_child.update(
						{ where: { id_hazard_form_child: form.id_hazard_form_child },
							data: {
								form: args.form,
								version: args.version
							}
						});
					await tx.hazard_form_child_history.create(
						{ data: {
								form: args.form,
								version: args.version,
								id_hazard_form_child: form.id_hazard_form_child,
								modified_by: context.user.username,
								modified_on: new Date()
							}
						});
				});
			}
		});
	}
});

