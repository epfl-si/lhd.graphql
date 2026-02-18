import {booleanArg, extendType, intArg, list, objectType, stringArg} from 'nexus';
import {bio_org, lab_has_hazards_child} from 'nexus-prisma';
import {mutationStatusType} from "../statuses";
import {IDObfuscator, submission} from "../../utils/IDObfuscator";
import {HazardFormChildHistoryStruct} from "./hazardFormChildHistory";
import {getLabHasHazardToString, LabHazardStruct} from "./labHazard";
import {authorization_status, Prisma} from '@prisma/client';
import {
	acceptBoolean,
	acceptInteger,
	acceptNumberFromString,
	acceptSubstringInList
} from "../../utils/fieldValidatePlugin";
import {sanitizeSearchString} from "../../utils/searchStrings";
import {
	alphanumericRegexp,
	casRegexp,
	chemicalNameRegexp, hazardCategoryNameRegexp,
	roomNameRegexp,
	unitNameRegexp, validateId
} from "../../api/lib/lhdValidators";

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

export async function updateHazardFormChild(tx: any, child: submission, parentHazard: number) {
	IDObfuscator.checkId(child.id);

	const formChild = await tx.hazard_form_child.findFirst({where: {hazard_form_child_name: child.formName}});
	const historyChildLastVersion = await tx.hazard_form_child_history.findFirst({
		where: {
			id_hazard_form_child: formChild.id_hazard_form_child,
			version: formChild.version
		}
	});

	if ( child.id.eph_id.startsWith('newHazardChild') ) {
		if (child.submission.data['status'] === 'Default') {
			await tx.lab_has_hazards_child.create({
				data: {
					id_lab_has_hazards: parentHazard,
					id_hazard_form_child_history: historyChildLastVersion.id_hazard_form_child_history,
					submission: JSON.stringify(child.submission)
				}
			})
		}
	} else {
		const haz = await IDObfuscator.getObjectByObfuscatedId(child.id,
			'lab_has_hazards_child', 'id_lab_has_hazards_child',
			tx, 'Hazard', getLabHasHazardChildToString);

		if ( child.submission.data['status'] === 'Default' ) {
			await tx.lab_has_hazards_child.update(
				{
					where: {id_lab_has_hazards_child: haz.id_lab_has_hazards_child},
					data: {
						id_hazard_form_child_history: historyChildLastVersion.id_hazard_form_child_history,
						submission: JSON.stringify(child.submission)
					}
				});
		} else if ( child.submission.data['status'] === 'Deleted' ) {
			await tx.lab_has_hazards_child.delete({
				where: {
					id_lab_has_hazards_child: haz.id_lab_has_hazards_child
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

export async function updateBioOrg(tx: any, oldBioOrg: bio_org, newBioOrg: bio_org) {
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
		t.string("id_lab_has_hazards");
		t.string("global_comment");
		t.string("modified_by");
		t.field("modified_on", { type: "DateTime" });
		t.string("tags");
	}
});

export const HazardsWithPaginationStruct = objectType({
	name: 'HazardsWithPagination',
	definition(t) {
		t.nonNull.list.nonNull.field('hazards', { type: 'HazardFlat' });
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
			validate: {
				skip: acceptInteger,
				take: acceptInteger,
				search: hazardCategoryNameRegexp,
				queryString: (s) => sanitizeSearchString(s, {
					chemical: {rename: 'chemical.haz_en', validate: alphanumericRegexp},
					organism: {rename: 'organism.organism', validate: alphanumericRegexp},
					container: {rename: 'container.name', validate: alphanumericRegexp},
					Room: {rename: 'room', validate: roomNameRegexp},
					Cosec: {rename: 'cosec', validate: alphanumericRegexp},
					Prof: {rename: 'prof', validate: alphanumericRegexp},
					Unit: {rename: 'unit', validate: unitNameRegexp}
				}, true),
			},
			async resolve(parent, args, context) {
				let jsonCondition = Prisma.raw(`1=1`);
				const conditions = args.queryString as any || {};

				const sql = Object.keys(conditions).map(key => {
					if (key === 'room') {
						return Prisma.sql`l.lab_display like ${Prisma.raw(`'%${conditions[key]}%'`)}`;
					} else if (key === 'cosec') {
						return Prisma.sql`(cos.email_person like ${Prisma.raw(`'%${conditions[key]}%'`)} 
						or cos.name_person like ${Prisma.raw(`'%${conditions[key]}%'`)} 
						or cos.surname_person like ${Prisma.raw(`'%${conditions[key]}%'`)})`;
					} else if (key === 'prof') {
						return Prisma.sql`(prof.email_person like ${Prisma.raw(`'%${conditions[key]}%'`)} 
						or prof.name_person like ${Prisma.raw(`'%${conditions[key]}%'`)} 
						or prof.surname_person like ${Prisma.raw(`'%${conditions[key]}%'`)})`;
					} else if (key === 'unit') {
						return Prisma.sql`(u.name_unit like ${Prisma.raw(`'%${conditions[key]}%'`)} 
						or i.name_institut like ${Prisma.raw(`'%${conditions[key]}%'`)} 
						or f.name_faculty like ${Prisma.raw(`'%${conditions[key]}%'`)})`;
					} else {
						return Prisma.sql`
	(JSON_VALUE(lhhc.submission, ${Prisma.raw(`'$.data.${key}'`)}) like ${Prisma.raw(`'%${conditions[key]}%'`)} OR 
	 JSON_VALUE(lhh.submission, ${Prisma.raw(`'$.data.${key}'`)}) like ${Prisma.raw(`'%${conditions[key]}%'`)} OR
	 JSON_QUERY(lhhc.submission, ${Prisma.raw(`'$.data.${key}'`)}) like ${Prisma.raw(`'%${conditions[key]}%'`)} OR 
	 JSON_QUERY(lhh.submission, ${Prisma.raw(`'$.data.${key}'`)}) like ${Prisma.raw(`'%${conditions[key]}%'`)} )`;
					}
				});
				if (sql.length > 0) {
					jsonCondition = Prisma.sql`${Prisma.join(sql, ` AND `)}`;
				}

				const rawQuery = Prisma.sql`select distinct l.lab_display,
l.id_lab,
hc.hazard_category_name,
lhh.submission as parent_submission,
lhhc.submission as child_submission,
lhhc.id_lab_has_hazards_child,
lhh.id_lab_has_hazards,
lhhc.id_hazard_form_child_history,
hfh.id_hazard_form_history,
lhhai.comment as global_comment,
lhhai.modified_by,
lhhai.modified_on,
(select GROUP_CONCAT(CONCAT(tag_name, '=', comment) SEPARATOR '&&') AS tags 
 from tag
     inner join hazards_additional_info_has_tag on hazards_additional_info_has_tag.id_tag = tag.id_tag
 where hazards_additional_info_has_tag.id_lab_has_hazards_additional_info = lhhai.id_lab_has_hazards_additional_info) as tags
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
					h.submission = h.parent_submission;
					const encryptedIDForParent = IDObfuscator.obfuscate({id: h.id_lab_has_hazards, obj: getLabHasHazardToString(h)});
					h.id_lab_has_hazards = JSON.stringify(encryptedIDForParent);
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
			validate: {
				hazardCategory: hazardCategoryNameRegexp,
				units: acceptBoolean,
				cosecs: acceptBoolean,
				profs: acceptBoolean,
				search: (s) => sanitizeSearchString(s, {
					Room: {rename: 'room', validate: roomNameRegexp},
					Designation: {rename: 'designation', validate: alphanumericRegexp},
					Floor: {rename: 'floor', validate: alphanumericRegexp},
					Sector: {rename: 'sector', validate: alphanumericRegexp},
					Building: {rename: 'building', validate: alphanumericRegexp},
					Volume: {rename: 'volume', validate: acceptNumberFromString},
					Unit: {rename: 'unit', validate: unitNameRegexp}
				}),
			},
			async resolve(parent, args, context) {
				let selectedFieldForUnits = Prisma.raw(``);
				let selectedFieldsForCosecs = Prisma.raw(``);
				let selectedFieldsForProfs = Prisma.raw(``);
				let joinForUnits = Prisma.raw(``);
				let joinForCosecs = Prisma.raw(``);
				let joinDForProfs = Prisma.raw(``);

				const whereCondition = [];
				whereCondition.push(Prisma.sql`hc.hazard_category_name = ${args.hazardCategory}`)
				const conditions = args.search as any || {};

				Object.keys(conditions).forEach(key => {
						if (key === 'room') {
							whereCondition.push(Prisma.sql`l.lab_display like ${'%' + conditions[key] + '%'}`)
						} else if (key === 'designation') {
							whereCondition.push(Prisma.sql`lt.labType like ${'%' + conditions[key] + '%'}`)
						} else if (key === 'floor') {
							whereCondition.push(Prisma.sql`l.floor like ${'%' + conditions[key] + '%'}`)
						} else if (key === 'sector') {
							whereCondition.push(Prisma.sql`l.sector like ${'%' + conditions[key] + '%'}`)
						} else if (key === 'building') {
							whereCondition.push(Prisma.sql`l.building like ${'%' + conditions[key] + '%'}`)
						} else if (key === 'unit') {
							//whereCondition.push(Prisma.sql`(u.name_unit like %${'%' + conditions[key] + '%'}% or i.name_institut like %${'%' + conditions[key] + '%'}% or f.name_faculty like %${'%' + conditions[key] + '%'}%)`)
						} else if (key === 'volume' && !isNaN(parseFloat(conditions[key]))) {
							whereCondition.push(Prisma.sql`l.vol >= (${conditions[key]} - 10) AND l.vol <= (${conditions[key]} + 10)`)
						}
					});

				if (args.units || conditions.hasOwnProperty('unit')) {
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
			validate: {
				id: validateId
			},
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const child = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'lab_has_hazards_child', 'id_lab_has_hazards_child',
						tx, 'Hazard', getLabHasHazardChildToString);

					await tx.lab_has_hazards_child.delete({
						where: {
								id_lab_has_hazards_child: child.id_lab_has_hazards_child
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
