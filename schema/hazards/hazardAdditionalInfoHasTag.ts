import {extendType, objectType, stringArg} from 'nexus';
import {hazards_additional_info_has_tag} from 'nexus-prisma';
import {TagStruct} from "./tag";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {mutationStatusType} from "../statuses";
import {getHazardsAdditionalInfoToString} from "./hazardsAdditionalInfo";

export const HazardsAdditionalInfoHasTagStruct = objectType({
	name: hazards_additional_info_has_tag.$name,
	description: `The list of tags and comments for hazards in rooms.`,

	definition(t) {
		t.field(hazards_additional_info_has_tag.comment);

		t.nonNull.field('tag', {
			type: TagStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.tag.findUnique({
					where: { id_tag: parent.id_tag }
				});
			},
		});
		t.string('id', {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_hazards_additional_info_has_tag, obj: getHazardAdditionalInfoHasTagToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

function getHazardAdditionalInfoHasTagToString(parent) {
	return {
		id_hazards_additional_info_has_tag: parent.id_hazards_additional_info_has_tag,
		id_tag: parent.id_tag,
		id_lab_has_hazards_additional_info: parent.id_lab_has_hazards_additional_info,
		comment: parent.comment
	};
}

export const HazardsAdditionalInfoHasTagQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.hazardsAdditionalInfoHasTags({ filtering: true, ordering: true,
			authorize: (parent, args, context) => context.user.isAdmin || context.user.canListHazards,
			resolve: async (root, args, context, info, originalResolve) => {
				// Call the original resolver if user is authorized
				return originalResolve(root, args, context, info);
			} });
	},
});

const hazardTagType = {
	id: stringArg(),
	tag: stringArg(),
	comment: stringArg(),
	additionalInfoId: stringArg()
};

export const HazardTagStatus = mutationStatusType({
	name: "HazardTagStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the Hazard Tag mutation.`});
	}
});

export const HazardsAdditionalInfoHasTagMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('addTag', {
			description: `Add tag to hazard.`,
			args: hazardTagType,
			type: "HazardTagStatus",
			authorize: (parent, args, context) => context.user.isAdmin || context.user.canEditHazards,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const id = IDObfuscator.getId(args.id);
					IDObfuscator.checkId(id);

					if (id.eph_id.indexOf('newTag') == -1) {
						throw new Error(`Bad descrypted request`);
					}

					const additionalInfo = await IDObfuscator.ensureDBObjectIsTheSame(args.additionalInfoId,
						'lab_has_hazards_additional_info', 'id_lab_has_hazards_additional_info',
						tx, 'Additional Info', getHazardsAdditionalInfoToString);
					const tag = await tx.tag.findUnique({ where: { tag_name: args.tag }});
					await tx.hazards_additional_info_has_tag.create(
						{ data: {
								id_tag: tag.id_tag,
								id_lab_has_hazards_additional_info: additionalInfo.id_lab_has_hazards_additional_info,
								comment: args.comment
							}
						});
					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('updateTag', {
			description: `Update hazard tag.`,
			args: hazardTagType,
			type: "HazardFormStatus",
			authorize: (parent, args, context) => context.user.isAdmin || context.user.canEditHazards,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const tag = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'hazards_additional_info_has_tag', 'id_hazards_additional_info_has_tag',
						tx, 'Additional Info', getHazardAdditionalInfoHasTagToString);

					await tx.hazards_additional_info_has_tag.update(
						{ where: { id_hazards_additional_info_has_tag: tag.id_hazards_additional_info_has_tag },
							data: {
								comment: args.comment
							}
						});
					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('deleteTag', {
			description: `Delete hazard tag.`,
			args: hazardTagType,
			type: "HazardFormStatus",
			authorize: (parent, args, context) => context.user.isAdmin || context.user.canEditHazards,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const tag = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'hazards_additional_info_has_tag', 'id_hazards_additional_info_has_tag',
						tx, 'Additional Info', getHazardAdditionalInfoHasTagToString);

					await tx.hazards_additional_info_has_tag.delete(
						{ where: { id_hazards_additional_info_has_tag: tag.id_hazards_additional_info_has_tag }
						});
					return mutationStatusType.success();
				});
			}
		});
	}
});
