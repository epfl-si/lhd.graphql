import {extendType, objectType, stringArg} from 'nexus';
import {lab_has_hazards_child} from 'nexus-prisma';
import {HazardFormHistoryStruct} from "./hazardFormHistory";
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {IDObfuscator, submission} from "../../utils/IDObfuscator";
import {HazardFormChildHistoryStruct} from "./hazardFormChildHistory";
import {createNewMutationLog} from "../global/mutationLogs";
import {LabHazardStruct} from "./labHazard";

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
		t.nonNull.field('hazards', {
			type: LabHazardStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.lab_has_hazards.findUnique({
					where: { id_lab_has_hazards: parent.id_lab_has_hazards},
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

export async function updateHazardFormChild(child: submission, tx: any, context: any, room: string, parentHazard: number) {
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
		} else {
			await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, '', {}, hazardChild, 'CREATE');
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
			} else {
				await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, '', hazardsChildInRoom, hazardChild, 'UPDATE');
			}
		} else if ( child.submission.data['status'] == 'Deleted' ) {
			const hazardChild = await tx.lab_has_hazards_child.delete({
				where: {
					id_lab_has_hazards_child: id
				}
			});
			if ( !hazardChild ) {
				throw new Error(`Hazard child not deleted for room ${room}.`);
			} else {
				await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, '', hazardChild, {}, 'DELETE');
			}
		}
	}
}
