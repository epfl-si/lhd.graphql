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
 * Check for all expired authorizations
 *
 * Where “expired” is defined as being still `Active`, but with an
 * expiration date already past.
 *
 * For each expired authorization, update its status to `Expired` and notify
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
