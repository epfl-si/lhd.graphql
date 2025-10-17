import * as nodemailer from "nodemailer";
import {EMAIL_TEMPLATES, logRecipients} from "./EmailTemplates";
import {getUserInfoFromAPI} from "../CallAPI";

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
		to: process.env.ENVIRONMENT == 'prod' ? process.env.CAE_TO : modifiedByEmail,
		cc: process.env.ENVIRONMENT == 'prod' ? [modifiedByEmail, process.env.CAE_CC] : modifiedByEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT == 'prod' ? body : `${logRecipients([process.env.CAE_TO], [modifiedByEmail, process.env.CAE_CC], [])}\n${body}`
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
		to: process.env.ENVIRONMENT == 'prod' ? cosecs : modifiedByEmail,
		bcc: process.env.ENVIRONMENT == 'prod' ? [modifiedByEmail, process.env.COSEC_BCC] : modifiedByEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT == 'prod' ? body : `${logRecipients(cosecs, [], [modifiedByEmail, process.env.COSEC_BCC] )}\n${body}`
	});
}

export async function sendEmailsForHazards(user: string,
																					 hazardType: string,
																					 room: string,
																					 action: object,
																					 comment: string,
																					 cosecs: string[]) {
	if (process.env.HAZARD_TYPES_TO_EMAIL_AFTER_UPDATE.includes(hazardType)) {
		const userInfo = await getUserInfoFromAPI(user);
		await sendEmailCAE(userInfo.userFullName, userInfo.userEmail, room, action, hazardType, comment);
		await sendEmailCosec(userInfo.userFullName, userInfo.userEmail, room, action, hazardType, cosecs);
	}
}

export async function sendEmailsForChemical(user: string, tx: any) {
	const userInfo = await getUserInfoFromAPI(user);
	const chemicals = await tx.auth_chem.findMany({where: {flag_auth_chem: true}});
	const template = EMAIL_TEMPLATES.CHEMICAL;

	const csv: string = chemicals.map(chem => `${chem.cas_auth_chem},"${chem.auth_chem_en}"`).join('\n');

	await mailer.sendMail({
		from: `"No Reply" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT == 'prod' ? process.env.CATALYSE_EMAIL : userInfo.userEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT == 'prod' ? template.body : `${logRecipients([process.env.CATALYSE_EMAIL], [], [] )}\n${template.body}`,
		attachments: [{raw: ["Content-Type: text/csv; charset=utf-8", 'Content-Disposition: attachment; filename="chemicals.csv"', "", csv].join("\r\n"),}]
	});
}
