import {arg, extendType, inputObjectType, list, objectType, stringArg} from 'nexus';
import {lab_has_hazards} from 'nexus-prisma';
import {HazardFormHistoryStruct} from "./hazardFormHistory";
import {mutationStatusType} from "../statuses";
import {IDObfuscator, submission} from "../../utils/IDObfuscator";
import {LabHazardChildStruct, updateHazardFormChild} from "./labHazardChild";
import {RoomStruct} from "../global/rooms";
import * as dotenv from "dotenv";
import {saveBase64File} from "../../utils/fileUtilities";
import {sendEmailsForHazards} from "../../utils/email/mailer";
import {getUserInfoFromAPI} from "../../utils/callAPI";
import {
	fileContentRegexp,
	freeFormTextRegexp,
	hazardCategoryNameRegexp,
	pathRegexp,
	roomNameRegexp,
	validateId
} from "../../api/lib/lhdValidators";
import {acceptJson, sanitizeArray, sanitizeObject, sanitizeOptionalField} from "../../utils/fieldValidatePlugin";
import {FileMutationType} from "../../utils/mutationTypes";

dotenv.config();
const HAZARD_DOCUMENT_FOLDER = process.env.HAZARD_DOCUMENT_FOLDER;

export const LabHazardStruct = objectType({
	name: lab_has_hazards.$name,
	description: `The list of hazards categories.`,

	definition(t) {
		t.nonNull.field(lab_has_hazards.submission);
		t.nonNull.field('hazard_form_history', {
			type: HazardFormHistoryStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_form_history.findUnique({
					where: { id_hazard_form_history: parent.id_hazard_form_history},
					include: { hazard_form: true }
				});
			},
		});
		t.nonNull.list.nonNull.field('children', {
			type: LabHazardChildStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.lab_has_hazards_child.findMany({//submission
					where: { id_lab_has_hazards: (parent as any).id_lab_has_hazards },
					include: { hazard_form_child_history: true }
				});
			}
		});
		t.nonNull.field('room', {
			type: RoomStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.room.findUnique({
					where: { id: (parent as any).id_lab }
				});
			}
		});
		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_lab_has_hazards, obj: getLabHasHazardToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

export function getLabHasHazardToString(parent) {
	return {
		id_lab_has_hazards: parent.id_lab_has_hazards,
		id_lab: parent.id_lab,
		id_hazard_form_history: parent.id_hazard_form_history,
		submission: parent.submission
	};
}

export const RoomHazardStatus = mutationStatusType({
	name: "RoomHazardStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the Hazard mutation in room.`});
	}
});

export const AdditionalInfoType = inputObjectType({
	name: "AdditionalInfoType",
	definition(t) {
		t.string('comment');
	}
})

const roomHazardChangesType = {
	room: stringArg(),
	submission: stringArg(),
	category: stringArg(),
	additionalInfo: arg({
		type: 'AdditionalInfoType'
	}),
	files: list(FileMutationType)
};

export const RoomHazardMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('addHazardToRoom', {
			description: `Add a new hazard to the room.`,
			args: roomHazardChangesType,
			type: "RoomHazardStatus",
			authorize: (parent, args, context) => context.user.canEditHazards,
			validate: {
				room: roomNameRegexp,
				submission: acceptJson,
				category: hazardCategoryNameRegexp,
				additionalInfo: (s) => sanitizeObject(s, {
					comment: {validate: freeFormTextRegexp}
				}),
				files: (s) => sanitizeArray(s, {
					status: {validate: {enum: ["New", "Default", "Deleted"]}},
					base64: {validate: (s) => sanitizeOptionalField(s, fileContentRegexp), optional: true},
					path: {validate: (s) => sanitizeOptionalField(s, pathRegexp)},
				}),
			},
			async resolve(root, args, context) {
				const userInfo = await getUserInfoFromAPI(context.user.username);
				const roomResult = await context.prisma.$transaction(async (tx) => {
					const room = await tx.Room.findFirst(
						{
							where: { name: args.room },
							include: {
								unit_has_room: { include: { unit: { include: { unit_has_cosec: { include: { cosec: true } } } } } },
								lab_has_hazards: true
							}
						});

					if (! room) {
						throw new Error(`Room ${args.room} not found.`);
					}
					const submissionsHazards: submission[] = JSON.parse(args.submission);

					const category = await tx.hazard_category.findFirst({ where: { hazard_category_name: args.category }});

					for ( const h of submissionsHazards ) {
						IDObfuscator.checkId(h.id);

						const form = await tx.hazard_form.findFirst({ where: { id_hazard_category: category.id_hazard_category}});

						const historyLastVersion = await tx.hazard_form_history.findFirst({
							where: {
								id_hazard_form: form.id_hazard_form,
								version: form.version
							}
						});

						if (h.id.eph_id.startsWith('newHazard') && h.submission.data['status'] === 'Default') {
							const hazard = await tx.lab_has_hazards.create({
								data: {
									id_lab: room.id,
									id_hazard_form_history: historyLastVersion.id_hazard_form_history,
									submission: JSON.stringify(h.submission)
								}
							})

							for await (const child of h.children) {
								await updateHazardFormChild(tx, child, hazard.id_lab_has_hazards)
							}
						}
						else if (!h.id.eph_id.startsWith('newHazard')) {
							const haz = await IDObfuscator.getObjectByObfuscatedId(h.id,
								'lab_has_hazards', 'id_lab_has_hazards',
								tx, 'Hazard', getLabHasHazardToString);

							if (h.submission.data['status'] === 'Default'){
								const hazard = await tx.lab_has_hazards.update(
									{ where: { id_lab_has_hazards: haz.id_lab_has_hazards },
										data: {
											id_hazard_form_history: historyLastVersion.id_hazard_form_history,
											submission: JSON.stringify(h.submission)
										}
									});

								for await (const child of h.children) {
									await updateHazardFormChild(tx, child, hazard.id_lab_has_hazards)
								}
							}
							else if (h.submission.data['status'] === 'Deleted') {
								await deleteHazard(haz.id_lab_has_hazards, tx);
							}
						}
					}

					const additionalInfoResult = await tx.lab_has_hazards_additional_info.findFirst({
						where: {
							id_hazard_category: category.id_hazard_category,
							id_lab: room.id
						}});
					if (additionalInfoResult) {
						await tx.lab_has_hazards_additional_info.update(
							{ where: { id_lab_has_hazards_additional_info: additionalInfoResult.id_lab_has_hazards_additional_info },
								data: {
									modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
									modified_on: new Date(),
									comment: args.additionalInfo.comment ? args.additionalInfo.comment : '',
								}
							});
						await setAdditionaInfoRelations(tx, additionalInfoResult.id_lab_has_hazards_additional_info, args, room.id);
					} else {
						const newInfo = await tx.lab_has_hazards_additional_info.create({
							data: {
								modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
								modified_on: new Date(),
								comment: args.additionalInfo.comment ? args.additionalInfo.comment : '',
								id_hazard_category: category.id_hazard_category,
								id_lab: room.id
							}
						});
						await setAdditionaInfoRelations(tx, newInfo.id_lab_has_hazards_additional_info, args, room.id);
					}

					return room;
				});
				const cosecs = [];

				roomResult.unit_has_room.forEach(uhr => {
					uhr.unit.unit_has_cosec.forEach(uhc => {
						if (!cosecs.includes(uhc.cosec.email))
							cosecs.push(uhc.cosec.email);
					})
				});
				await sendEmailsForHazards(context.prisma, args, roomResult, cosecs, userInfo);
				return mutationStatusType.success();
			}
		});
		t.nonNull.field('deleteHazard', {
			description: `Delete an Hazard`,
			args: {
				id: stringArg(),
			},
			type: "RoomHazardStatus",
			authorize: (parent, args, context) => context.user.canEditHazards,
			validate: {
				id: validateId
			},
			async resolve(root, args, context) {
				const haz = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
					'lab_has_hazards', 'id_lab_has_hazards',
					context.prisma, 'Hazard', getLabHasHazardToString);
				await context.prisma.$transaction(async (tx) => {
					await deleteHazard(haz.id_lab_has_hazards, tx);
				});
				return mutationStatusType.success();
			}
		});
	}
});

async function deleteHazard (id: Number, tx) {
	await tx.lab_has_hazards_child.deleteMany({
		where: {
			id_lab_has_hazards: id
		}
	});

	await tx.lab_has_hazards.delete({
		where: {
			id_lab_has_hazards: id
		}
	});
}

async function setAdditionaInfoRelations(tx, id_info: number, changes, id_room: number) {
	for ( const file of changes.files || []) {
		if ( file.status === 'New' ) {
			await tx.HazardsAdditionalInfoHasFile.create({
				data: {
					id_lab_has_hazards_additional_info: id_info,
					file_path: saveBase64File(file.base64, HAZARD_DOCUMENT_FOLDER + changes.category + '/' + id_room + '/', file.path)
				}
			});
		} else if ( file.status === 'Deleted' ) {
			await tx.HazardsAdditionalInfoHasFile.deleteMany({
				where: {
					id_lab_has_hazards_additional_info: id_info,
					file_path: file.path
				}
			});
		}
	}
}
