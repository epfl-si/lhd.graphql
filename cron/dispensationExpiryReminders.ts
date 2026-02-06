import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {getExpiringDispensations, setDispensationNotified} from "../model/dispensation";
import {sendEmailForDispensation} from "../utils/Email/Mailer";

const cronUser = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditDispensations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), cronUser);

/**
 * Check for all expiring dispensations
 *
 * Where “expiring” is defined as being still `Active`, but with an
 * expiration date either already past, or no later than 30 days from now.
 *
 * For each expiring dispensation, notify the related holders.
 */
async function notifyExpiringDispensations () {
	const expiringDisps =  await getExpiringDispensations(prisma);
	for (const disp of expiringDisps) {
		await prisma.$transaction(async (tx) => {
			await sendEmailForDispensation(disp.modified_by, cronUser.userEmail, disp, 'expiringDispensation');
			await setDispensationNotified(tx, disp);
		},{
			maxWait: 10000, // Max time (ms) to wait for a transaction slot (default: 2000)
			timeout: 30000, // Max time (ms) the transaction can run (default: 5000)
		});
	}
}

notifyExpiringDispensations();
