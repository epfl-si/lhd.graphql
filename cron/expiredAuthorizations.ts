import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {sendEmailForAuthorization} from "../utils/Email/Mailer";
import {expireAuthorization, getExpiringAuthorizations} from "../model/authorization";
import {expiredAuthorization} from "../utils/Email/EmailTemplates";

const cronUser = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditAuthorizations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), cronUser);

/**
 * Checks for all expired authorizations (where `expiration_date` is earlier
 * than today and the status is still `Active`).
 *
 * For each expired authorization, updates its status to `Expired` and notifies
 * the related holders.
 */
async function expireAndNotifyAuthorizations () {
	const expiredAuths =  await getExpiringAuthorizations(prisma, 0);
	for (const auth of expiredAuths) {
		await prisma.$transaction(async (tx) => {
			const updated = await expireAuthorization(tx, auth);
			await sendEmailForAuthorization(cronUser.userFullName, cronUser.userEmail, updated, expiredAuthorization);
		},{
			maxWait: 10000, // Max time (ms) to wait for a transaction slot (default: 2000)
			timeout: 30000, // Max time (ms) the transaction can run (default: 5000)
		});
	}
}

expireAndNotifyAuthorizations();
