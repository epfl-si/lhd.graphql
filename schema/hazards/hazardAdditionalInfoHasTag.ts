import {extendType, objectType, stringArg} from 'nexus';
import {HazardsAdditionalInfoHasTag} from 'nexus-prisma';
import {TagStruct} from "./tag";
import {IDObfuscator} from "../../utils/IDObfuscator";
import {mutationStatusType} from "../statuses";
import {getLabHasHazardsAdditionalInfoToString} from "./hazardsAdditionalInfo";
import {getUserInfoFromAPI} from "../../utils/callAPI";
import {getRoomToString} from "../global/rooms";

export const HazardsAdditionalInfoHasTagStruct = objectType({
	name: HazardsAdditionalInfoHasTag.$name,
	description: `The list of tags and comments for hazards in rooms.`,

	definition(t) {
		t.field(HazardsAdditionalInfoHasTag.comment);

		t.nonNull.field('tag', {
			type: TagStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.Tag.findUnique({
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
			authorize: (parent, args, context) => context.user.canListHazards,
			resolve: async (root, args, context, info, originalResolve) => {
				// After user authorization, is he's authorized, call the original resolve
				return originalResolve(root, args, context, info);
			} });
	},
});

const hazardTagType = {
	id: stringArg(),
	tag: stringArg(),
	comment: stringArg(),
	additionalInfoId: stringArg(),
	categoryName: stringArg(),
	roomId: stringArg()
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
				const userInfo = await getUserInfoFromAPI(context.user.username);
				return await context.prisma.$transaction(async (tx) => {
					const id = IDObfuscator.getId(args.id);
					IDObfuscator.checkId(id);

					if (id.eph_id.indexOf('newTag') == -1) {
						throw new Error(`Bad descrypted request`);
					}

					let additionalInfo;
					if (args.additionalInfoId !== '') {
						additionalInfo = await IDObfuscator.ensureDBObjectIsTheSame(args.additionalInfoId,
							'lab_has_hazards_additional_info', 'id_lab_has_hazards_additional_info',
							tx, 'Additional Info', getLabHasHazardsAdditionalInfoToString);
					} else if (args.roomId) {
						const room = await IDObfuscator.ensureDBObjectIsTheSame(args.roomId,
							'Room', 'id',
							tx, "room", getRoomToString);

						const category = await tx.hazard_category.findFirst({where: {hazard_category_name: args.categoryName}});
						if (!category) {
							throw new Error(`Category ${args.categoryName} not found`);
						}

						additionalInfo = await tx.lab_has_hazards_additional_info.create({
							data: {
								modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
								modified_on: new Date(),
								comment: '',
								id_hazard_category: category.id_hazard_category,
								id_lab: room.id
							}
						});
					}

					const tag = await tx.Tag.findUnique({ where: { tag_name: args.tag }});
					await tx.HazardsAdditionalInfoHasTag.create(
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
						'HazardsAdditionalInfoHasTag', 'id_hazards_additional_info_has_tag',
						tx, 'Additional Info', getHazardAdditionalInfoHasTagToString);

					await tx.HazardsAdditionalInfoHasTag.update(
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
			authorize: (parent, args, context) => context.user.canEditHazards,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const tag = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'HazardsAdditionalInfoHasTag', 'id_hazards_additional_info_has_tag',
						tx, 'Additional Info', getHazardAdditionalInfoHasTagToString);

					await tx.HazardsAdditionalInfoHasTag.delete(
						{ where: { id_hazards_additional_info_has_tag: tag.id_hazards_additional_info_has_tag }
						});
					return mutationStatusType.success();
				});
			}
		});
	}
});
