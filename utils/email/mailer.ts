import * as nodemailer from "nodemailer";
import {
	cancelledDispensation,
	chemical, expiredDispensation,
	expiringDispensation,
	hazardsCae,
	hazardsCosec,
	logAction,
	logRecipients, modifiedDispensation, newDispensation,
	renewDispensation
} from "./EmailTemplates";
import {getUserInfoFromAPI} from "../callAPI";
import {getHazardLevel} from "../hazardsParser";
import {getFormattedDate} from "../date";

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
	const template = hazardsCae;

	const body = template.body.replaceAll("{{modifiedByName}}", modifiedByName)
		.replaceAll("{{modifiedOn}}", getFormattedDate(new Date()))
		.replaceAll("{{room}}", room)
		.replaceAll("{{action.fr}}", action['fr'])
		.replaceAll("{{action.en}}", action['en'])
		.replaceAll("{{hazardType}}", hazardType)
		.replaceAll("{{comments}}", decodeURIComponent(comments));

	await mailer.sendMail({
		from: `"LHD" <${process.env.SMTP_USER}>`,
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
	const template = hazardsCosec;

	const body = template.body.replaceAll("{{modifiedByName}}", modifiedByName)
		.replaceAll("{{modifiedOn}}", getFormattedDate(new Date()))
		.replaceAll("{{room}}", room)
		.replaceAll("{{action.fr}}", action['fr'])
		.replaceAll("{{action.en}}", action['en'])
		.replaceAll("{{hazardType}}", hazardType);

	await mailer.sendMail({
		from: `"LHD" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT === 'prod' ? cosecs : modifiedByEmail,
		bcc: process.env.ENVIRONMENT === 'prod' ? [modifiedByEmail, process.env.COSEC_BCC] : modifiedByEmail,
		subject: template.subject,
		html: process.env.ENVIRONMENT === 'prod' ? body : `${logRecipients(cosecs, [], [modifiedByEmail, process.env.COSEC_BCC] )}\n${body}`
	});
}

export async function sendEmailsForHazards(
	prisma: any,
	args: any,
	oldRoom: any,
	cosecs: string[],
	userInfo: {
																						 userFullName: string;
																						 userEmail: string;
																						 sciper: string
																					 }
	) {
	if ( process.env.HAZARD_TYPES_TO_EMAIL_AFTER_UPDATE.includes(args.category) ) {
		const newRoom = await prisma.Room.findFirst(
			{
				where: {name: args.room},
				include: {
					lab_has_hazards: true
				}
			});
		const oldValues = getHazardLevel(oldRoom.lab_has_hazards, args.category);
		const newValues = getHazardLevel(newRoom.lab_has_hazards, args.category);
		const created = (oldValues.laser.length == 0 && newValues.laser.length > 0) || (oldValues.bio.length == 0 && newValues.bio.length > 0);
		const deleted = (oldValues.laser.length > 0 && newValues.laser.length == 0) || (oldValues.bio.length > 0 && newValues.bio.length == 0);
		if ( created || deleted ) {
			if ( userInfo.userEmail !== '' ) {
				await sendEmailCAE(userInfo.userFullName, userInfo.userEmail, args.room,
					logAction(created, deleted), args.category, args.additionalInfo.comment);
				await sendEmailCosec(userInfo.userFullName, userInfo.userEmail, args.room,
					logAction(created, deleted), args.category, cosecs);
			}
		}
	}
}

export async function sendEmailsForChemical(prisma, user: string) {
	const userInfo = await getUserInfoFromAPI(user);
	const chemicals = await prisma.auth_chem.findMany({where: {flag_auth_chem: true}});
	const template = chemical;

	const csv: string = chemicals.map(chem => `${chem.cas_auth_chem},"${chem.auth_chem_en}"`).join('\n');

	if (userInfo.userEmail !== '') {
		await mailer.sendMail({
			from: `"LHD" <${process.env.SMTP_USER}>`,
			to: process.env.ENVIRONMENT === 'prod' ? process.env.CATALYSE_EMAIL : userInfo.userEmail,
			subject: template.subject,
			html: process.env.ENVIRONMENT === 'prod' ? template.body : `${logRecipients([process.env.CATALYSE_EMAIL], [], [])}\n${template.body}`,
			attachments: [{raw: ["Content-Type: text/csv; charset=utf-8", `Content-Disposition: attachment; filename="chemicals-${getFormattedDate(new Date(), '')}.csv"`, "", csv].join("\r\n"),}]
		});
	}
}

export async function sendEmailForDispensation(modifiedByName: string,
															modifiedByEmail: string,
															dispensation: any,
															action: 'newDispensation' |
																'renewDispensation' |
																'expiredDispensation' |
																'modifiedDispensation' |
																'cancelledDispensation' |
																'expiringDispensation'
) {
	let template = newDispensation;
	switch ( action ) {
		case "newDispensation":
			template = newDispensation;
			break;
		case "renewDispensation":
			template = renewDispensation;
			break;
		case "expiredDispensation":
			template = expiredDispensation;
			break;
		case "modifiedDispensation":
			template = modifiedDispensation;
			break;
		case "cancelledDispensation":
			template = cancelledDispensation;
			break;
		case "expiringDispensation":
			template = expiringDispensation;
			break;
	}
	const body = template.body.replaceAll("{{modifiedByName}}", modifiedByName)
		.replaceAll("{{dispNumber}}", `DISP-${dispensation.id_dispensation}`)
		.replaceAll("{{subject}}", dispensation.subject.subject)
		.replaceAll("{{dateStart}}", getFormattedDate(dispensation.date_start))
		.replaceAll("{{dateEnd}}", getFormattedDate(dispensation.date_end))
		.replaceAll("{{requirements}}", dispensation.description)
		.replaceAll("{{comments}}", dispensation.comment)
		.replaceAll("{{status}}", dispensation.status)
		.replaceAll("{{rooms}}", dispensation.dispensation_has_room.map(dhr => `<a href="${process.env.APP_BASE_PATH}/roomdetails?room=${dhr.room.name}">${dhr.room.name}</a>`).join(', '))
		.replaceAll("{{holders}}", dispensation.dispensation_has_holder.map(dhr => `${dhr.holder.name} ${dhr.holder.surname} (${dhr.holder.sciper})`).join(', '))
		.replaceAll("{{tickets}}", dispensation.dispensation_has_ticket.map(dhr => `<a href="https://go.epfl.ch/${dhr.ticket_number}">${dhr.ticket_number}</a>`).join(', '));

	const holders = dispensation.dispensation_has_holder.map(dhr => dhr.holder.email);
	const profs = dispensation.dispensation_has_unit.flatMap(dhu => dhu.unit.subunpro).map(pers => pers.person.email);
	const cosecs = dispensation.dispensation_has_unit.flatMap(dhu => dhu.unit.unit_has_cosec).map(pers => pers.cosec.email);
	const cc = [modifiedByEmail, process.env.DISPENSATION_CC, profs, cosecs];
	await mailer.sendMail({
		from: `"LHD" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT === 'prod' ? holders : modifiedByEmail,
		cc: process.env.ENVIRONMENT === 'prod' ? cc : modifiedByEmail,
		subject: template.subject.replaceAll("{{dispNumber}}", `DISP-${dispensation.id_dispensation}`),
		html: process.env.ENVIRONMENT === 'prod' ? body : `${logRecipients(holders, cc, [] )}\n${body}`
	});
}

export async function sendEmailForAuthorization(modifiedByName: string,
																							 modifiedByEmail: string,
																							 authorization: any,
																							 template: { body: string; subject: string; }) {
	const body = template.body.replaceAll("{{authNumber}}", authorization.authorization);

	const holders = [];
	await mailer.sendMail({
		from: `"LHD" <${process.env.SMTP_USER}>`,
		to: process.env.ENVIRONMENT === 'prod' ? holders : modifiedByEmail,
		cc: process.env.ENVIRONMENT === 'prod' ? [modifiedByEmail] : modifiedByEmail,
		subject: template.subject.replaceAll("{{authNumber}}", authorization.authorization),
		html: process.env.ENVIRONMENT === 'prod' ? body : `${logRecipients(holders, [modifiedByEmail], [] )}\n${body}`
	});
}
