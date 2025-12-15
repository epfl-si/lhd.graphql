import * as nodemailer from "nodemailer";
import {EMAIL_TEMPLATES, logAction, logRecipients} from "./EmailTemplates";
import {getUserInfoFromAPI} from "../CallAPI";
import {getHazardLevel} from "../hazardsParser";

export const mailer = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT) || 587,
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.LHD_API_PASSWORD
	},
});

async function sendEmailCAE(modifiedByName: string,
														modifiedByEmail: string,
														room: string,
														action: object,
														hazardType: string,
														comments: string) {
	const template = EMAIL_TEMPLATES.HAZARDS_CAE;

	const body = template.body.replaceAll("{{modifiedByName}}", modifiedByName)
		.replaceAll("{{modifiedOn}}", (new Date()).toLocaleDateString("en-GB"))
		.replaceAll("{{room}}", room)
		.replaceAll("{{action.fr}}", action['fr'])
		.replaceAll("{{action.en}}", action['en'])
		.replaceAll("{{hazardType}}", hazardType)
		.replaceAll("{{comments}}", decodeURIComponent(comments));

	await mailer.sendMail({
		from: `"No Reply" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT === 'prod' ? process.env.CAE_TO : modifiedByEmail,
		cc: process.env.ENVIRONMENT === 'prod' ? [modifiedByEmail, process.env.CAE_CC] : modifiedByEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT === 'prod' ? body : `${logRecipients([process.env.CAE_TO], [modifiedByEmail, process.env.CAE_CC], [])}\n${body}`
	});
}

async function sendEmailCosec(modifiedByName: string,
															modifiedByEmail: string,
															room: string,
															action: object,
															hazardType: string,
															cosecs: string[]) {
	const template = EMAIL_TEMPLATES.HAZARDS_COSEC;

	const body = template.body.replaceAll("{{modifiedByName}}", modifiedByName)
		.replaceAll("{{modifiedOn}}", (new Date()).toLocaleDateString("en-GB"))
		.replaceAll("{{room}}", room)
		.replaceAll("{{action.fr}}", action['fr'])
		.replaceAll("{{action.en}}", action['en'])
		.replaceAll("{{hazardType}}", hazardType);

	await mailer.sendMail({
		from: `"No Reply" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT === 'prod' ? cosecs : modifiedByEmail,
		bcc: process.env.ENVIRONMENT === 'prod' ? [modifiedByEmail, process.env.COSEC_BCC] : modifiedByEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT === 'prod' ? body : `${logRecipients(cosecs, [], [modifiedByEmail, process.env.COSEC_BCC] )}\n${body}`
	});
}

export async function sendEmailsForHazards(user: string,
																					 args: any,
																					 oldRoom: any,
																					 cosecs: string[],
																					 prisma: any,
																					 userInfo: {
																						 userFullName: string;
																						 userEmail: string;
																						 sciper: string
																					 }
	) {
	const newRoom = await prisma.Room.findFirst(
		{
			where: { name: args.room },
			include: {
				lab_has_hazards: true
			}
		});
	const oldValues = getHazardLevel(oldRoom.lab_has_hazards, args.category);
	const newValues = getHazardLevel(newRoom.lab_has_hazards, args.category);
	const created = (oldValues.laser.length == 0 && newValues.laser.length > 0) || (oldValues.bio.length == 0 && newValues.bio.length > 0);
	const deleted = (oldValues.laser.length > 0 && newValues.laser.length == 0) || (oldValues.bio.length > 0 && newValues.bio.length == 0);
	if (process.env.HAZARD_TYPES_TO_EMAIL_AFTER_UPDATE.includes(args.category) && (created || deleted)) {
		if (userInfo.userEmail !== '') {
			await sendEmailCAE(userInfo.userFullName, userInfo.userEmail, args.room,
				logAction(created, deleted), args.category, args.additionalInfo.comment);
			await sendEmailCosec(userInfo.userFullName, userInfo.userEmail, args.room,
				logAction(created, deleted), args.category, cosecs);
		}
	}
}

export async function sendEmailsForChemical(user: string, prisma) {
	const userInfo = await getUserInfoFromAPI(user);
	const chemicals = await prisma.auth_chem.findMany({where: {flag_auth_chem: true}});
	const template = EMAIL_TEMPLATES.CHEMICAL;

	const csv: string = chemicals.map(chem => `${chem.cas_auth_chem},"${chem.auth_chem_en}"`).join('\n');

	if (userInfo.userEmail !== '') {
		await mailer.sendMail({
			from: `"No Reply" <${process.env.SMTP_USER}>`,
			to: process.env.ENVIRONMENT === 'prod' ? process.env.CATALYSE_EMAIL : userInfo.userEmail,
			subject: template.subject,
			html: process.env.ENVIRONMENT === 'prod' ? template.body : `${logRecipients([process.env.CATALYSE_EMAIL], [], [])}\n${template.body}`,
			attachments: [{raw: ["Content-Type: text/csv; charset=utf-8", `Content-Disposition: attachment; filename="chemicals-${getFormattedDate()}.csv"`, "", csv].join("\r\n"),}]
		});
	}
}

function getFormattedDate() {
	const date = new Date();

	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = String(date.getFullYear()).slice(-2); // Get last 2 digits

	return `${day}${month}${year}`;
}
