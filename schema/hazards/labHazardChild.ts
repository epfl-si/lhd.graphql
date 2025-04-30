import {extendType, intArg, objectType, stringArg} from 'nexus';
import {bio_org, lab_has_hazards_child} from 'nexus-prisma';
import {HazardFormHistoryStruct} from "./hazardFormHistory";
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {IDObfuscator, submission} from "../../utils/IDObfuscator";
import {HazardFormChildHistoryStruct} from "./hazardFormChildHistory";
import {createNewMutationLog} from "../global/mutationLogs";
import {LabHazardStruct} from "./labHazard";
import { Prisma } from '@prisma/client';

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
	if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1) {
		throw new Error('Permission denied');
	}
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
			await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, hazardChild.id_lab_has_hazards_child,'', {}, hazardChild, 'CREATE');
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
				await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, hazardChild.id_lab_has_hazards_child, '', hazardsChildInRoom, hazardChild, 'UPDATE');
			}
		} else if ( child.submission.data['status'] == 'Deleted' ) {
			const hazardChild = await tx.lab_has_hazards_child.delete({
				where: {
					id_lab_has_hazards_child: id
				}
			});
			const lab_has_hazardsList = await tx.lab_has_hazards_child.findMany({where: {id_lab_has_hazards: parentHazard}});
			if (lab_has_hazardsList.length == 0) {
				const hazard = await tx.lab_has_hazards.delete({
					where: {
						id_lab_has_hazards: parentHazard
					}
				});
				if ( !hazard ) {
					throw new Error(`Hazard not deleted for room ${room}.`);
				} else {
					await createNewMutationLog(tx, context, tx.lab_has_hazards.name, 0, '', hazard, {}, 'DELETE');
				}
			}
			if ( !hazardChild ) {
				throw new Error(`Hazard child not deleted for room ${room}.`);
			} else {
				await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, 0, '', hazardChild, {}, 'DELETE');
			}
		}
	}
}

export async function updateBioOrg(oldBioOrg: bio_org, newBioOrg: bio_org, tx: any, context: any) {
	if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1) {
		throw new Error('Permission denied');
	}
	const children = await tx.lab_has_hazards_child.findMany({where: {submission: {contains: `"organism":"${oldBioOrg.organism}"`}}});
	for ( const child of children ) {
		const newSubmission = JSON.parse(child.submission);
		newSubmission.data.organism.organism = newBioOrg.organism;
		newSubmission.data.organism.risk_group = newBioOrg.risk_group;
		newSubmission.data.organism.filePath = newBioOrg.filePath;
		newSubmission.data.fileLink = newBioOrg.filePath;
		newSubmission.data.riskGroup = newBioOrg.risk_group;
		const hazardChild = await tx.lab_has_hazards_child.update(
			{
				where: {id_lab_has_hazards_child: child.id_lab_has_hazards_child},
				data: {
					submission: JSON.stringify(newSubmission)
				}
			});
		if ( hazardChild ) {
			await createNewMutationLog(tx, context, tx.lab_has_hazards_child.name, hazardChild.id_lab_has_hazards_child, '', child, hazardChild, 'UPDATE');
		}
	}
}

export const HazardFlat = objectType({
	name: "HazardFlat",
	definition(t) {
		t.string("lab_display");
		t.string("hazard_category_name");
		t.string("parent_submission");
		t.string("child_submission");
		t.int("id_lab_has_hazards_child");
		t.int("id_lab_has_hazards");
	}
});

export const HazardsWithPaginationStruct = objectType({
	name: 'HazardsWithPagination',
	definition(t) {
		t.list.field('hazards', { type: 'HazardFlat' });
		t.int('totalCount');
	},
});

export const HazardsWithPaginationQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("hazardsWithPagination", {
			type: "HazardsWithPagination",
			args: {
				skip: intArg({ default: 0 }),
				take: intArg({ default: 20 }),
				search: stringArg(),
				queryString: stringArg(),
			},
			async resolve(parent, args, context) {
				if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
					throw new Error(`Permission denied`);
				}

				let jsonCondition = Prisma.raw(`1=1`);
				if (args.queryString != '') {
					const queryStringArgs = args.queryString.split('&');
					const sql = queryStringArgs.map(qs => {
						const queryStringMap = qs.split('=');

						if (queryStringMap[0] == 'chemical')
							queryStringMap[0] = 'chemical.haz_en';
						else if (queryStringMap[0] == 'organism')
							queryStringMap[0] = 'organism.organism';
						else if (queryStringMap[0] == 'container')
							queryStringMap[0] = 'container.name';

						if (queryStringMap[0] == 'lab_display') {
							return Prisma.sql`l.lab_display like ${Prisma.raw(`'%${queryStringMap[1]}%'`)}`;
						} else {
							return Prisma.sql`
    (JSON_VALUE(lhhc.submission, ${Prisma.raw(`'$.data.${queryStringMap[0]}'`)}) like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} OR 
     JSON_VALUE(lhh.submission, ${Prisma.raw(`'$.data.${queryStringMap[0]}'`)}) like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} OR
     JSON_QUERY(lhhc.submission, ${Prisma.raw(`'$.data.${queryStringMap[0]}'`)}) like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} OR 
     JSON_QUERY(lhh.submission, ${Prisma.raw(`'$.data.${queryStringMap[0]}'`)}) like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} )`;
						}
					})
					jsonCondition = Prisma.sql`${Prisma.join(sql, ` AND `)}`;
				}


				const rawQuery = Prisma.sql`select l.lab_display, 
hc.hazard_category_name, 
lhh.submission as parent_submission, 
lhhc.submission as child_submission,
lhhc.id_lab_has_hazards_child,
lhh.id_lab_has_hazards
from lab_has_hazards_child lhhc 
right join lab_has_hazards lhh on lhh.id_lab_has_hazards = lhhc.id_lab_has_hazards
inner join hazard_form_history hfh on hfh.id_hazard_form_history =lhh.id_hazard_form_history
inner join hazard_form hf on hf.id_hazard_form = hfh.id_hazard_form
inner join hazard_category hc on hc.id_hazard_category = hf.id_hazard_category 
inner join lab l on l.id_lab = lhh.id_lab
where hc.hazard_category_name = ${args.search}
and ${jsonCondition}
order by l.lab_display asc
`;
				const hazardList = await context.prisma.$queryRaw(rawQuery);
				const hazards = hazardList.slice(args.skip, args.skip + args.take);
				const totalCount = hazardList.length;

				return { hazards, totalCount };
			}
		});
	},
});
