import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {getExpiringDispensations} from "../model/dispensation";
import {sendEmailForDispensation} from "../utils/Email/Mailer";
import {EMAIL_TEMPLATES} from "../utils/Email/EmailTemplates";

const userInfo = {
	username: 'CronJobs',
	userFullName: 'CronJob',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditDispensations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), userInfo);

async function notifyExpiringDispensations () {
	const expiringDisps =  await getExpiringDispensations(prisma);
	for (const disp of expiringDisps) {
		await sendEmailForDispensation(disp.modified_by, userInfo.userEmail, disp, EMAIL_TEMPLATES.EXPIRING_DISPENSATION);
	}
}

notifyExpiringDispensations();
