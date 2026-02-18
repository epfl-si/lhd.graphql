import {extendType, objectType, stringArg} from 'nexus';
import {hazard_form} from 'nexus-prisma';
import {HazardCategoryStruct} from "./hazardCategory";
import {mutationStatusType} from "../statuses";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {HazardFormChildStruct} from "./hazardFormChild";
import {hazardCategoryNameRegexp, hazardFormVersionRegexp, validateId} from "../../api/lib/lhdValidators";
import {acceptJson} from "../../utils/fieldValidatePlugin";

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
			authorize: (parent, args, context) => context.user.canListForms,
			resolve: async (root, args, context, info, originalResolve) => {
				// After user authorization, is he's authorized, call the original resolve
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
			validate: {
				form: acceptJson,
				version: hazardFormVersionRegexp,
				hazard_category_name: hazardCategoryNameRegexp
			},
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const category = await tx.hazard_category.create(
						{ data: {
								hazard_category_name: args.hazard_category_name
							}
						});
					const form = await tx.hazard_form.create(
						{ data: {
								form: args.form,
								version: args.version,
								id_hazard_category: category.id_hazard_category
							}
						});

					await tx.hazard_form_history.create(
						{ data: {
								form: args.form,
								version: args.version,
								id_hazard_form: form.id_hazard_form,
								modified_by: context.user.username,
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
			validate: {
				id: validateId,
				form: acceptJson,
				version: hazardFormVersionRegexp
			},
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const form = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'hazard_form', 'id_hazard_form',
						tx, 'Hazard', getHazardFormToString);

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
								modified_by: context.user.username,
								modified_on: new Date()
							}
						});
					return mutationStatusType.success();
				});
			}
		});
	}
});

