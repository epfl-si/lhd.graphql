import {booleanArg, extendType, list, objectType, stringArg} from 'nexus';
import {lab_has_hazards, Unit} from 'nexus-prisma';
import {HazardFormHistoryStruct} from "./hazardFormHistory";
import {Person} from "@prisma/client";
import {mutationStatusType} from "../statuses";
import {UnitMutationType} from "../roomdetails/units";

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
	},
});

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
						const room = await tx.Room.findFirst({ where: { name: args.room }});
						if (! room) {
							throw new Error(`Room ${args.room} not found.`);
						}
						console.log("room", room);

						const category = await tx.hazard_category.findFirst({ where: { hazard_category_name: args.category }});

						const form = await tx.hazard_form.findFirst({ where: { id_hazard_category: category.id_hazard_category}});

						const historyLastVersion = await tx.hazard_form_history.findFirst({
							where: {
								id_hazard_form: form.id_hazard_form,
								version: form.version
							}
						});

						const hazardsInRoom = await tx.lab_has_hazards.findFirst({
							where: {
								id_lab: room.id,
								id_hazard_form_history: historyLastVersion.id_hazard_form_history
							}
						});

						if (hazardsInRoom) {
							const hazard = await tx.lab_has_hazards.update(
								{ where: { id_lab_has_hazards: hazardsInRoom.id_lab_has_hazards },
									data: {
										submission: args.submission
									}
								});
							if ( !hazard ) {
								throw new Error(`Hazard not created for room ${args.room}.`);
							}
						} else {
							const hazard = await tx.lab_has_hazards.create({
								data: {
									id_lab: room.id,
									id_hazard_form_history: historyLastVersion.id_hazard_form_history,
									submission: args.submission
								}
							})
							if ( !hazard ) {
								throw new Error(`Hazard not updated for room ${args.room}.`);
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
