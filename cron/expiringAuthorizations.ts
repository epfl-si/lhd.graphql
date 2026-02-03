import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {sendEmailForAuthorization} from "../utils/Email/Mailer";
import {EMAIL_TEMPLATES} from "../utils/Email/EmailTemplates";
import {getExpiringAuthorizations} from "../model/authorization";

const cronUser = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditAuthorizations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), cronUser);

/**
 * Checks for all expiring authorizations
 * (where `expiration_date` is greater than or equal to now (not expired yet) but less than or equal to 30 days from now
 * and the status is still `Active`).
 *
 * For each expiring authorization, notifies the related holders.
 */
async function notifyExpiringAuthorizations () {
	const expiringDisps =  await getExpiringAuthorizations(prisma);
	for (const disp of expiringDisps) {
		await sendEmailForAuthorization(disp.modified_by, cronUser.userEmail, disp, EMAIL_TEMPLATES.EXPIRING_AUTHORIZATION);
	}
}

notifyExpiringAuthorizations();
