import {extendType, objectType, stringArg} from 'nexus';
import {lab_has_hazards_child} from 'nexus-prisma';
import {HazardFormHistoryStruct} from "./hazardFormHistory";
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {IDObfuscator, submission} from "../../utils/IDObfuscator";
import {HazardFormChildHistoryStruct} from "./hazardFormChildHistory";

export const LabHazardChildStruct = objectType({
	name: lab_has_hazards_child.$name,
	description: `The list of hazards child.`,

	definition(t) {
		t.nonNull.field(lab_has_hazards_child.submission);
		t.nonNull.field('hazard_form_child_history', {
			type: HazardFormChildHistoryStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.hazard_form_child_history.findUnique({
					where: { id_hazard_form_child_history: parent.id_hazard_form_child_history},
					include: { hazard_form_child: true }
				});
			},
		});
		t.string('id',  {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_lab_has_hazards_child, obj: getLabHasHazardChildToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

export function getLabHasHazardChildToString(parent) {
	return {
		id_lab_has_hazards_child: parent.id_lab_has_hazards_child,
		id_lab_has_hazards: parent.id_lab_has_hazards,
		id_hazard_form_child_history: parent.id_hazard_form_child_history,
		submission: parent.submission
	};
}

export const RoomHazardChildStatus = mutationStatusType({
	name: "RoomHazardChildStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the Hazard child mutation in room.`});
	}
});

/*const roomHazardChildChangesType = {
	room: stringArg(),
	submission: stringArg(),
	category: stringArg()
};*/

export async function updateHazardFormChild(child: submission, tx: any, room: string, parentHazard: number) {
	if ( child.id == undefined || child.id.eph_id == undefined || child.id.eph_id == '' || child.id.salt == undefined || child.id.salt == '' ) {
		throw new Error(`Not allowed to update hazards child`);
	}

	const formChild = await tx.hazard_form_child.findFirst({where: {hazard_form_child_name: child.formName}});
	const historyChildLastVersion = await tx.hazard_form_child_history.findFirst({
		where: {
			id_hazard_form_child: formChild.id_hazard_form_child,
			version: formChild.version
		}
	});

	if ( child.id.eph_id.startsWith('newHazardChild') && child.submission.data['status'] == 'Default' ) {
		const hazardChild = await tx.lab_has_hazards_child.create({
			data: {
				id_lab_has_hazards: parentHazard,
				id_hazard_form_child_history: historyChildLastVersion.id_hazard_form_child_history,
				submission: JSON.stringify(child.submission)
			}
		})
		if ( !hazardChild ) {
			throw new Error(`Hazard child not created for room ${room}.`);
		}
	} else if ( !child.id.eph_id.startsWith('newHazardChild') ) {
		if ( !IDObfuscator.checkSalt(child.id) ) {
			throw new Error(`Bad descrypted request`);
		}
		const id = IDObfuscator.deobfuscateId(child.id);
		const hazardsChildInRoom = await tx.lab_has_hazards_child.findUnique({where: {id_lab_has_hazards_child: id}});
		if ( !hazardsChildInRoom ) {
			throw new Error(`Hazard child not found.`);
		}
		const labHasHazardChildObject = getSHA256(JSON.stringify(getLabHasHazardChildToString(hazardsChildInRoom)), child.id.salt);
		if ( IDObfuscator.getDataSHA256(child.id) !== labHasHazardChildObject ) {
			throw new Error(`Hazard child has been changed from another user. Please reload the page to make modifications`);
		}

		if ( child.submission.data['status'] == 'Default' ) {
			const hazardChild = await tx.lab_has_hazards_child.update(
				{
					where: {id_lab_has_hazards_child: id},
					data: {
						id_hazard_form_child_history: historyChildLastVersion.id_hazard_form_child_history,
						submission: JSON.stringify(child.submission)
					}
				});
			if ( !hazardChild ) {
				throw new Error(`Hazard child not updated for room ${room}.`);
			}
		} else if ( child.submission.data['status'] == 'Deleted' ) {
			const hazardChild = await tx.lab_has_hazards_child.delete({
				where: {
					id_lab_has_hazards_child: id
				}
			});
			if ( !hazardChild ) {
				throw new Error(`Hazard child not deleted for room ${room}.`);
			}
		}
	}
}
/*
export const RoomHazardMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('addHazardToRoom', {
			description: `Add a new hazard to the room.`,
			args: roomHazardChildChangesType,
			type: "RoomHazardChildStatus",
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

							if (h.id.eph_id.startsWith('newHazard') && h.submission.data['status'] == 'Default') {
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
							} else if (!h.id.eph_id.startsWith('newHazard')) {
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
									}
								} else if (h.submission.data['status'] == 'Deleted') {
									const hazard = await tx.lab_has_hazards.delete({
											where: {
												id_lab_has_hazards: id
											}
										});
									if ( !hazard ) {
										throw new Error(`Hazard not deleted for room ${args.room}.`);
									}
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
});*/
