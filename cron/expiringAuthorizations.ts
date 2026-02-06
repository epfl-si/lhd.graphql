import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {sendEmailForAuthorization} from "../utils/Email/Mailer";
import {getExpiringAuthorizations, setAuthorizationNotified} from "../model/authorization";
import {expiringAuthorization} from "../utils/Email/EmailTemplates";

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
	const expiringAuths =  await getExpiringAuthorizations(prisma);
	for (const auth of expiringAuths) {
		await prisma.$transaction(async (tx) => {
			await sendEmailForAuthorization(auth.modified_by, cronUser.userEmail, auth, expiringAuthorization);
			await setAuthorizationNotified(tx, auth);
		},{
			maxWait: 10000, // Max time (ms) to wait for a transaction slot (default: 2000)
			timeout: 30000, // Max time (ms) the transaction can run (default: 5000)
		});
	}
}

notifyExpiringAuthorizations();
