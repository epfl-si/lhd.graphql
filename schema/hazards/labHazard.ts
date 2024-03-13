import {extendType, objectType, stringArg} from 'nexus';
import {lab_has_hazards} from 'nexus-prisma';
import {HazardFormHistoryStruct} from "./hazardFormHistory";
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {IDObfuscator, submission} from "../../utils/IDObfuscator";

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

const roomHazardChangesType = {
	room: stringArg(),
	submission: stringArg(),
	category: stringArg()
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
					return await context.prisma.$transaction(async (tx) => {
						const submissionsHazards: submission[] = JSON.parse(args.submission);
						for ( const h of submissionsHazards ) {
							if(h.id == undefined || h.id.eph_id == undefined || h.id.eph_id == '' || h.id.salt == undefined || h.id.salt == '') {
								throw new Error(`Not allowed to update hazards`);
							}

							const category = await tx.hazard_category.findFirst({ where: { hazard_category_name: args.category }});

							const form = await tx.hazard_form.findFirst({ where: { id_hazard_category: category.id_hazard_category}});

							const historyLastVersion = await tx.hazard_form_history.findFirst({
								where: {
									id_hazard_form: form.id_hazard_form,
									version: form.version
								}
							});

							if (h.id.eph_id == 'newHazard') {
								const room = await tx.Room.findFirst({ where: { name: args.room }});
								if (! room) {
									throw new Error(`Room ${args.room} not found.`);
								}
								const hazard = await tx.lab_has_hazards.create({
									data: {
										id_lab: room.id,
										id_hazard_form_history: historyLastVersion.id_hazard_form_history,
										submission: JSON.stringify(h.submission)
									}
								})
								if ( !hazard ) {
									throw new Error(`Hazard not created for room ${args.room}.`);
								}
							} else {
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
								const hazard = await tx.lab_has_hazards.update(
									{ where: { id_lab_has_hazards: id },
										data: {
											id_hazard_form_history: historyLastVersion.id_hazard_form_history,
											submission: JSON.stringify(h.submission)
										}
									});
								if ( !hazard ) {
									throw new Error(`Hazard not updated for room ${args.room}.`);
								}
							}
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
