import * as nodemailer from "nodemailer";
import {EMAIL_TEMPLATES, logRecipients} from "./EmailTemplates";
import {getUsersFromApi} from "../CallAPI";

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
														modifiedOn: Date,
														room: string,
														action: object,
														hazardType: string,
														comments: string) {
	const template = EMAIL_TEMPLATES.HAZARDS_CAE;

	const body = template.body.replaceAll("{{modifiedByName}}", modifiedByName)
		.replaceAll("{{modifiedOn}}", modifiedOn.toLocaleDateString("en-GB"))
		.replaceAll("{{room}}", room)
		.replaceAll("{{action.fr}}", action['fr'])
		.replaceAll("{{action.en}}", action['en'])
		.replaceAll("{{hazardType}}", hazardType)
		.replaceAll("{{comments}}", comments);

	await mailer.sendMail({
		from: `"No Reply" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT == 'PROD' ? process.env.CAE_TO : modifiedByEmail,
		cc: process.env.ENVIRONMENT == 'PROD' ? [modifiedByEmail, process.env.CAE_CC] : modifiedByEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT == 'PROD' ? body : `${logRecipients([process.env.CAE_TO], [modifiedByEmail, process.env.CAE_CC], [])}\n${body}`
	});
}

async function sendEmailCosec(modifiedByName: string,
															modifiedByEmail: string,
															modifiedOn: Date,
															room: string,
															action: object,
															hazardType: string,
															cosecs: string[]) {
	const template = EMAIL_TEMPLATES.HAZARDS_COSEC;

	const body = template.body.replaceAll("{{modifiedByName}}", modifiedByName)
		.replaceAll("{{modifiedOn}}", modifiedOn.toLocaleDateString("en-GB"))
		.replaceAll("{{room}}", room)
		.replaceAll("{{action.fr}}", action['fr'])
		.replaceAll("{{action.en}}", action['en'])
		.replaceAll("{{hazardType}}", hazardType);

	await mailer.sendMail({
		from: `"No Reply" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT == 'PROD' ? cosecs : modifiedByEmail,
		bcc: process.env.ENVIRONMENT == 'PROD' ? [modifiedByEmail, process.env.COSEC_BCC] : modifiedByEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT == 'PROD' ? body : `${logRecipients(cosecs, [], [modifiedByEmail, process.env.COSEC_BCC] )}\n${body}`
	});
}

export async function sendEmailsForHazards(user: string,
																					 hazardType: string,
																					 room: string,
																					 action: object,
																					 comment: string,
																					 cosecs: string[]) {
	if (process.env.HAZARD_TYPES_TO_EMAIL_AFTER_UPDATE.includes(hazardType)) {
		let userName = user;
		let userEmail = '';
		const ldapUsers = await getUsersFromApi(user);
		const ldapUser = ldapUsers["persons"].filter(u => u.account && u.account.username == user);
		if (ldapUser.length == 1) {
			userName = ldapUser.display;
			userEmail = ldapUser.email;
		}
		await sendEmailCAE(userName, userEmail, new Date(), room, action, hazardType, comment);
		await sendEmailCosec(userName, userEmail, new Date(), room, action, hazardType, cosecs);
	}
}
