import {booleanArg, extendType, intArg, list, objectType, stringArg} from 'nexus';
import {bio_org, lab_has_hazards_child} from 'nexus-prisma';
import {mutationStatusType} from "../statuses";
import {getSHA256} from "../../utils/HashingTools";
import {id, IDObfuscator, submission} from "../../utils/IDObfuscator";
import {HazardFormChildHistoryStruct} from "./hazardFormChildHistory";
import {LabHazardStruct} from "./labHazard";
import {Prisma} from '@prisma/client';

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
		await tx.lab_has_hazards_child.create({
			data: {
				id_lab_has_hazards: parentHazard,
				id_hazard_form_child_history: historyChildLastVersion.id_hazard_form_child_history,
				submission: JSON.stringify(child.submission)
			}
		})
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
			await tx.lab_has_hazards_child.update(
				{
					where: {id_lab_has_hazards_child: id},
					data: {
						id_hazard_form_child_history: historyChildLastVersion.id_hazard_form_child_history,
						submission: JSON.stringify(child.submission)
					}
				});
		} else if ( child.submission.data['status'] == 'Deleted' ) {
			await tx.lab_has_hazards_child.delete({
				where: {
					id_lab_has_hazards_child: id
				}
			});
			const lab_has_hazardsList = await tx.lab_has_hazards_child.findMany({where: {id_lab_has_hazards: parentHazard}});
			if (lab_has_hazardsList.length == 0) {
				await tx.lab_has_hazards.delete({
					where: {
						id_lab_has_hazards: parentHazard
					}
				});
			}
		}
	}
}

export async function updateBioOrg(oldBioOrg: bio_org, newBioOrg: bio_org, tx: any, context: any) {
	const children = await tx.lab_has_hazards_child.findMany({where: {submission: {contains: `"organism":"${oldBioOrg.organism}"`}}});
	for ( const child of children ) {
		const newSubmission = JSON.parse(child.submission);
		newSubmission.data.organism.organism = newBioOrg.organism;
		newSubmission.data.organism.risk_group = newBioOrg.risk_group;
		newSubmission.data.organism.filePath = newBioOrg.filePath;
		newSubmission.data.fileLink = newBioOrg.filePath;
		newSubmission.data.riskGroup = newBioOrg.risk_group;
		await tx.lab_has_hazards_child.update(
			{
				where: {id_lab_has_hazards_child: child.id_lab_has_hazards_child},
				data: {
					submission: JSON.stringify(newSubmission)
				}
			});
	}
}

export const HazardFlat = objectType({
	name: "HazardFlat",
	definition(t) {
		t.string("lab_display");
		t.string("hazard_category_name");
		t.string("parent_submission");
		t.string("child_submission");
		t.string("id_lab_has_hazards_child");
		t.int("id_lab_has_hazards");
		t.string("global_comment");
		t.string("modified_by");
		t.field("modified_on", { type: "DateTime" });
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
			authorize: (parent, args, context) => context.user.canListHazards,
			async resolve(parent, args, context) {
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

						if (queryStringMap[0] == 'Room') {
							return Prisma.sql`l.lab_display like ${Prisma.raw(`'%${queryStringMap[1]}%'`)}`;
						} else if (queryStringMap[0] == 'Cosec') {
							return Prisma.sql`(cos.email_person like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} 
							or cos.name_person like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} 
							or cos.surname_person like ${Prisma.raw(`'%${queryStringMap[1]}%'`)})`;
						} else if (queryStringMap[0] == 'Prof') {
							return Prisma.sql`(prof.email_person like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} 
							or prof.name_person like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} 
							or prof.surname_person like ${Prisma.raw(`'%${queryStringMap[1]}%'`)})`;
						} else if (queryStringMap[0] == 'Unit') {
							return Prisma.sql`(u.name_unit like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} 
							or i.name_institut like ${Prisma.raw(`'%${queryStringMap[1]}%'`)} 
							or f.name_faculty like ${Prisma.raw(`'%${queryStringMap[1]}%'`)})`;
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


				const rawQuery = Prisma.sql`select distinct l.lab_display, 
hc.hazard_category_name, 
lhh.submission as parent_submission, 
lhhc.submission as child_submission,
lhhc.id_lab_has_hazards_child,
lhh.id_lab_has_hazards,
lhhc.id_hazard_form_child_history,
lhhai.comment as global_comment,
lhhai.modified_by,
lhhai.modified_on
from lab_has_hazards_child lhhc 
right join lab_has_hazards lhh on lhh.id_lab_has_hazards = lhhc.id_lab_has_hazards
inner join hazard_form_history hfh on hfh.id_hazard_form_history =lhh.id_hazard_form_history
inner join hazard_form hf on hf.id_hazard_form = hfh.id_hazard_form
inner join hazard_category hc on hc.id_hazard_category = hf.id_hazard_category 
inner join lab l on l.id_lab = lhh.id_lab
left join unit_has_room uhr on uhr.id_lab = l.id_lab
left join unit u on u.id_unit = uhr.id_unit
left join unit_has_cosec uhc on uhc.id_unit = u.id_unit
left join person cos on cos.id_person = uhc.id_person
left join subunpro s on s.id_unit = u.id_unit
left join person prof on s.id_person = prof.id_person
left join institut i on i.id_institut = u.id_institut
left join faculty f on f.id_faculty = i.id_faculty
left join lab_has_hazards_additional_info lhhai on lhhai.id_lab = l.id_lab
where hc.hazard_category_name = ${args.search}
and lhhai.id_hazard_category = hc.id_hazard_category 
and ${jsonCondition}
order by l.lab_display asc
`;
				const hazardList = await context.prisma.$queryRaw(rawQuery);
				const hazardsFiltered = args.take == 0 ? hazardList : hazardList.slice(args.skip, args.skip + args.take);
				const hazards = hazardsFiltered.map(h => {
					if (h.id_lab_has_hazards_child) {
						h.submission = h.child_submission;
						const encryptedID = IDObfuscator.obfuscate({id: h.id_lab_has_hazards_child, obj: getLabHasHazardChildToString(h)});
						h.id_lab_has_hazards_child = JSON.stringify(encryptedID);
					}
					return h;
				});
				const totalCount = hazardList.length;

				return { hazards, totalCount };
			}
		});
	},
});

export const HazardFlatForExport = objectType({
	name: "HazardFlatForExport",
	definition(t) {
		t.string("lab_display");
		t.string("site");
		t.string("building");
		t.string("sector");
		t.string("floor");
		t.string("vol");
		t.string("labType");
		t.string("unit");
		t.string("institut");
		t.string("faculty");
		t.string("cosec");
		t.string("email_cosec");
		t.string("professor");
		t.string("email_professor");
		t.string("hazard");
		t.string("parent_submission");
		t.string("child_submission");
	}
});

export const HazardFetchForExportQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("hazardFetchForExport", {
			type: list("HazardFlatForExport"),
			args: {
				hazardCategory: stringArg(),
				units: booleanArg(),
				cosecs: booleanArg(),
				profs: booleanArg(),
				search: stringArg()
			},
			authorize: (parent, args, context) => context.user.canListHazards,
			async resolve(parent, args, context) {
				let selectedFieldForUnits = Prisma.raw(``);
				let selectedFieldsForCosecs = Prisma.raw(``);
				let selectedFieldsForProfs = Prisma.raw(``);
				let joinForUnits = Prisma.raw(``);
				let joinForCosecs = Prisma.raw(``);
				let joinDForProfs = Prisma.raw(``);

				const queryArray = args.search.split("&");
				const dictionary = queryArray.map(query => query.split("="));
				const whereCondition = [];
				whereCondition.push(Prisma.sql`hc.hazard_category_name = ${args.hazardCategory}`)
				if (dictionary.length > 0) {
					dictionary.forEach(query => {
						const value = decodeURIComponent(query[1]);
						if (query[0] == 'Room') {
							whereCondition.push(Prisma.sql`l.lab_display like ${'%' + value + '%'}`)
						} else if (query[0] == 'Designation') {
							whereCondition.push(Prisma.sql`lt.labType like ${'%' + value + '%'}`)
						} else if (query[0] == 'Floor') {
							whereCondition.push(Prisma.sql`l.floor like ${'%' + value + '%'}`)
						} else if (query[0] == 'Sector') {
							whereCondition.push(Prisma.sql`l.sector like ${'%' + value + '%'}`)
						} else if (query[0] == 'Building') {
							whereCondition.push(Prisma.sql`l.building like ${'%' + value + '%'}`)
						} else if (query[0] == 'Unit') {
							//whereCondition.push(Prisma.sql`(u.name_unit like %${'%' + value + '%'}% or i.name_institut like %${'%' + value + '%'}% or f.name_faculty like %${'%' + value + '%'}%)`)
						} else if (query[0] == 'Volume' && !isNaN(parseFloat(value))) {
							whereCondition.push(Prisma.sql`l.vol >= (${value} - 10) AND l.vol <= (${value} + 10)`)
						}
					})
				}

				if (args.units || args.search.indexOf('&Unit=') > -1) {
						selectedFieldForUnits = Prisma.sql`u.name_unit as unit,i.name_institut as institut,f.name_faculty as faculty,`;
						joinForUnits = Prisma.sql`
left join unit_has_room uhr on uhr.id_lab = l.id_lab
left join unit u on u.id_unit = uhr.id_unit
left join institut i on i.id_institut = u.id_institut
left join faculty f on f.id_faculty = i.id_faculty`
				}
				if (args.cosecs) {
					selectedFieldsForCosecs = Prisma.sql`
CONCAT(cos.name_person, ' ', cos.surname_person) as cosec,
cos.email_person as email_cosec,`;
					joinForCosecs = Prisma.sql`
left join unit_has_cosec uhc on uhc.id_unit = u.id_unit
left join person cos on cos.id_person = uhc.id_person`
				}
				if (args.profs) {
					selectedFieldsForProfs = Prisma.sql`
CONCAT(prof.name_person, ' ', prof.surname_person) as professor,
prof.email_person as email_professor,`;
					joinDForProfs = Prisma.sql`
left join subunpro s on s.id_unit = u.id_unit
left join person prof on s.id_person = prof.id_person`
				}

				const whereConditionRaw = Prisma.sql`${Prisma.join(whereCondition, ` AND `)}`;
				const selectedFields = Prisma.sql`${Prisma.join([selectedFieldForUnits, selectedFieldsForCosecs, selectedFieldsForProfs], ``)}`;
				const joins = Prisma.sql`${Prisma.join([joinForUnits, joinForCosecs, joinDForProfs], ``)}`;
				const rawQuery = Prisma.sql`select l.lab_display,
l.site,
l.building,
l.sector,
l.floor,
l.vol,
lt.labType,${selectedFields}
hc.hazard_category_name as hazard,
lhh.submission as parent_submission,
lhhc.submission as child_submission
from lab l ${joins}
left join labType lt on lt.id_labType = l.id_labType
left join lab_has_hazards lhh on lhh.id_lab = l.id_lab
left join hazard_form_history hfh on hfh.id_hazard_form_history = lhh.id_hazard_form_history
left join hazard_form hf on hf.id_hazard_form = hfh.id_hazard_form
left join hazard_category hc on hc.id_hazard_category = hf.id_hazard_category
left join lab_has_hazards_child lhhc on lhh.id_lab_has_hazards = lhhc.id_lab_has_hazards
where ${whereConditionRaw}
order by l.lab_display asc`;

				const hazardList = await context.prisma.$queryRaw(rawQuery);

				return hazardList;
			}
		});
	},
});

const hazardChildMutationsType = {
	id: stringArg(),
};

export const HazardChildStatus = mutationStatusType({
	name: "HazardChildStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the hazard child mutation status.`});
	}
});

export const HazardChildMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('deleteHazardChild', {
			description: `Delete an Hazard child`,
			args: hazardChildMutationsType,
			type: "HazardChildStatus",
			authorize: (parent, args, context) => context.user.canEditHazards,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					if (!args.id) {
						throw new Error(`Not allowed to delete hazard child`);
					}
					const id: id = JSON.parse(args.id);
					if (id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
						throw new Error(`Not allowed to delete hazard child`);
					}

					if (!IDObfuscator.checkSalt(id)) {
						throw new Error(`Bad descrypted request`);
					}
					const idDeobfuscated = IDObfuscator.deobfuscateId(id);
					const child = await tx.lab_has_hazards_child.findUnique({where: {id_lab_has_hazards_child: idDeobfuscated}});
					if (! child) {
						throw new Error(`Hazard child not found.`);
					}
					const childObject =  getSHA256(JSON.stringify(getLabHasHazardChildToString(child)), id.salt);
					if (IDObfuscator.getDataSHA256(id) !== childObject) {
						throw new Error(`Hazard child has been changed from another user. Please reload the page to make modifications`);
					}

					await tx.lab_has_hazards_child.delete({
						where: {
								id_lab_has_hazards_child: idDeobfuscated
						}
					});
					const lab_has_hazardsList = await tx.lab_has_hazards_child.findMany({where: {id_lab_has_hazards: child.id_lab_has_hazards}});
					if (lab_has_hazardsList.length == 0) {
						await tx.lab_has_hazards.delete({
							where: {
								id_lab_has_hazards: child.id_lab_has_hazards
							}
						});
					}
					return mutationStatusType.success();
				});
			}
		});
	}
});
