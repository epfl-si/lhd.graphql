import {arg, extendType, inputObjectType, list, objectType, stringArg} from 'nexus';
import {lab_has_hazards} from 'nexus-prisma';
import {HazardFormHistoryStruct} from "./hazardFormHistory";
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {IDObfuscator, submission} from "../../utils/IDObfuscator";
import {LabHazardChildStruct, updateHazardFormChild} from "./labHazardChild";
import {createNewMutationLog} from "../global/mutationLogs";
import {RoomStruct} from "../global/rooms";
import * as dotenv from "dotenv";
import {saveBase64File} from "../../utils/File";
import {sendEmailsForHazards} from "../../utils/Email/Mailer";
import {logAction} from "../../utils/Email/EmailTemplates";
import {getUserInfoFromAPI} from "../../utils/CallAPI";

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

function getLabHasHazardToString(parent) {
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
		t.string('file');
		t.string('fileName');
	}
})

const roomHazardChangesType = {
	room: stringArg(),
	submission: stringArg(),
	category: stringArg(),
	additionalInfo: arg({
		type: 'AdditionalInfoType'
	})
};

export const RoomHazardMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('addHazardToRoom', {
			description: `Add a new hazard to the room.`,
			args: roomHazardChangesType,
			type: "RoomHazardStatus",
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1) {
						throw new Error('Permission denied');
					}
					return await context.prisma.$transaction(async (tx) => {
						const room = await tx.Room.findFirst(
							{
								where: { name: args.room },
								include: { unit_has_room: { include: { unit: { include: { unit_has_cosec: { include: { cosec: true } } } } } } }
							});

						if (! room) {
							throw new Error(`Room ${args.room} not found.`);
						}
						const submissionsHazards: submission[] = JSON.parse(args.submission);

						const category = await tx.hazard_category.findFirst({ where: { hazard_category_name: args.category }});

						const log = [];

						for ( const h of submissionsHazards ) {
							if(h.id == undefined || h.id.eph_id == undefined || h.id.eph_id == '' || h.id.salt == undefined || h.id.salt == '') {
								throw new Error(`Not allowed to update hazards`);
							}

							const form = await tx.hazard_form.findFirst({ where: { id_hazard_category: category.id_hazard_category}});

							const historyLastVersion = await tx.hazard_form_history.findFirst({
								where: {
									id_hazard_form: form.id_hazard_form,
									version: form.version
								}
							});

							if (h.id.eph_id.startsWith('newHazard') && h.submission.data['status'] == 'Default') {
								const hazard = await tx.lab_has_hazards.create({
									data: {
										id_lab: room.id,
										id_hazard_form_history: historyLastVersion.id_hazard_form_history,
										submission: JSON.stringify(h.submission)
									}
								})
								if ( !hazard ) {
									throw new Error(`Hazard not created for room ${args.room}.`);
								} else {
									await createNewMutationLog(tx, context, tx.lab_has_hazards.name, hazard.id_lab_has_hazards, '', {}, hazard, 'CREATE');
								}

								for await (const child of h.children) {
									await updateHazardFormChild(child, tx, context, args.room, hazard.id_lab_has_hazards)
								}
								log.push({'status': 'Created', 'submission': h.submission, 'children': h.children});
							}
							else if (!h.id.eph_id.startsWith('newHazard')) {
								if(!IDObfuscator.checkSalt(h.id)) {
									throw new Error(`Bad descrypted request`);
								}
								const id = IDObfuscator.deobfuscateId(h.id);
								const hazardsInRoom = await tx.lab_has_hazards.findUnique({where: {id_lab_has_hazards: id}});
								if (! hazardsInRoom) {
									throw new Error(`Hazard not found.`);
								}
								const labHasHazardObject =  getSHA256(JSON.stringify(getLabHasHazardToString(hazardsInRoom)), h.id.salt);
								if (IDObfuscator.getDataSHA256(h.id) !== labHasHazardObject) {
									throw new Error(`Hazard has been changed from another user. Please reload the page to make modifications`);
								}

								if (h.submission.data['status'] == 'Default'){
									const hazard = await tx.lab_has_hazards.update(
										{ where: { id_lab_has_hazards: id },
											data: {
												id_hazard_form_history: historyLastVersion.id_hazard_form_history,
												submission: JSON.stringify(h.submission)
											}
										});
									if ( !hazard ) {
										throw new Error(`Hazard not updated for room ${args.room}.`);
									} else {
										await createNewMutationLog(tx, context, tx.lab_has_hazards.name, hazard.id_lab_has_hazards, '', hazardsInRoom, hazard, 'UPDATE');
									}

									for await (const child of h.children) {
										await updateHazardFormChild(child, tx, context, args.room, hazard.id_lab_has_hazards)
									}
									log.push({'status': 'Modified', 'submission': h.submission, 'children': h.children});
								}
								else if (h.submission.data['status'] == 'Deleted') {
									const hazardChildren = await tx.lab_has_hazards_child.deleteMany({
										where: {
											id_lab_has_hazards: id
										}
									});
									if ( !hazardChildren ) {
										throw new Error(`Hazard not deleted for room ${args.room}.`);
									} else if (hazardChildren.count > 0) {
										await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, 0, '', {id_lab_has_hazards: id}, {}, 'DELETE');
									}

									const hazard = await tx.lab_has_hazards.delete({
											where: {
												id_lab_has_hazards: id
											}
										});
									if ( !hazard ) {
										throw new Error(`Hazard not deleted for room ${args.room}.`);
									} else {
										await createNewMutationLog(tx, context, tx.lab_has_hazards.name, 0, '', hazard, {}, 'DELETE');
									}
									log.push({'status': 'Deleted', 'submission': h.submission, 'children': []});
								}
							}
						}

						let filePath = '';

						if (args.additionalInfo.file && args.additionalInfo.file != '' && args.additionalInfo.fileName && args.additionalInfo.fileName != '') {
							filePath = saveBase64File(args.additionalInfo.file,  HAZARD_DOCUMENT_FOLDER + args.category + '/' + room.id + '/', args.additionalInfo.fileName)
						}

						const additionalInfoResult = await tx.lab_has_hazards_additional_info.findFirst({
							where: {
								id_hazard_category: category.id_hazard_category,
								id_lab: room.id
							}});
						if (additionalInfoResult) {
							const userInfo = await getUserInfoFromAPI(context.user.preferred_username);
							const info = await tx.lab_has_hazards_additional_info.update(
								{ where: { id_lab_has_hazards_additional_info: additionalInfoResult.id_lab_has_hazards_additional_info },
									data: {
										modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
										modified_on: new Date(),
										comment: args.additionalInfo.comment ? args.additionalInfo.comment : '',
										filePath: filePath != '' ? filePath : additionalInfoResult.filePath
									}
								});

							if ( !info ) {
								throw new Error(`Additional information not updated for room ${args.room}.`);
							} else {
								await createNewMutationLog(tx, context, tx.lab_has_hazards_additional_info.name, info.id_lab_has_hazards_additional_info, '', additionalInfoResult, info, 'UPDATE');
							}
						} else {
							const userInfo = await getUserInfoFromAPI(context.user.preferred_username);
							const info = await tx.lab_has_hazards_additional_info.create({
								data: {
									modified_by: `${userInfo.userFullName} (${userInfo.sciper})`,
									modified_on: new Date(),
									comment: args.additionalInfo.comment ? args.additionalInfo.comment : '',
									filePath: filePath,
									id_hazard_category: category.id_hazard_category,
									id_lab: room.id
								}
							});

							if ( !info ) {
								throw new Error(`Additional information not created for room ${args.room}.`);
							} else {
								await createNewMutationLog(tx, context, tx.lab_has_hazards_additional_info.name, info.id_lab_has_hazards_additional_info, '', {}, info, 'CREATE');
							}
						}

						const cosecs = [];

						room.unit_has_room.forEach(uhr => {
							uhr.unit.unit_has_cosec.forEach(uhc => {
								if (!cosecs.includes(uhc.cosec.email))
									cosecs.push(uhc.cosec.email);
							})
						})

						await sendEmailsForHazards(context.user.preferred_username, args.category, args.room,
							logAction(log), args.additionalInfo.comment, cosecs);

						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
	}
});
