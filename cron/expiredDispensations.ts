import {getPrismaForUser} from "../utils/auditablePrisma";
import {configFromDotEnv} from "../utils/config";
import {expireDispensation, getDispensation, getExpiringDispensations} from "../model/dispensation";
import {sendEmailForDispensation} from "../utils/email/mailer";

const cronUser = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditDispensations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), cronUser);

/**
 * Check for all expired dispensations
 *
 * Where “expired” is defined as being still `Active`, but with an
 * expiration date already past.
 *
 * For each expired dispensation, update its status to `Expired` and notify
 * the related holders.
 */
async function expireAndNotifyDispensations () {
	const expiredDisps =  await getExpiringDispensations(prisma, 0);
	for (const disp of expiredDisps) {
		await prisma.$transaction(async (tx) => {
			await expireDispensation(tx, disp, cronUser);
			const updated = await getDispensation(tx, disp.id_dispensation);
			await sendEmailForDispensation(cronUser.userFullName, cronUser.userEmail, updated, 'expiredDispensation');
		},{
			maxWait: 10000, // Max time (ms) to wait for a transaction slot (default: 2000)
			timeout: 30000, // Max time (ms) the transaction can run (default: 5000)
		});
	}
}

expireAndNotifyDispensations();
