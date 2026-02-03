import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {getExpiringDispensations} from "../model/dispensation";
import {sendEmailForDispensation} from "../utils/Email/Mailer";
import {EMAIL_TEMPLATES} from "../utils/Email/EmailTemplates";

const cronUser = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditDispensations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), cronUser);

async function notifyExpiringDispensations () {
	const expiringDisps =  await getExpiringDispensations(prisma);
	for (const disp of expiringDisps) {
		await sendEmailForDispensation(disp.modified_by, cronUser.userEmail, disp, EMAIL_TEMPLATES.EXPIRING_DISPENSATION);
	}
}

notifyExpiringDispensations();
