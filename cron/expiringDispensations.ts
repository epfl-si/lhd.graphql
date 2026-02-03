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

/**
 * Checks for all expiring dispensations
 * (where `date_end` is greater than or equal to now (not expired yet) but less than or equal to 30 days from now
 * and the status is still `Active`).
 *
 * For each expiring dispensation, notifies the related holders.
 */
async function notifyExpiringDispensations () {
	const expiringDisps =  await getExpiringDispensations(prisma);
	for (const disp of expiringDisps) {
		await sendEmailForDispensation(disp.modified_by, cronUser.userEmail, disp, EMAIL_TEMPLATES.EXPIRING_DISPENSATION);
	}
}

notifyExpiringDispensations();
