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
 * Checks for all expiring dispensations
 * (where `date_end` is greater than or equal to now (not expired yet) but less than or equal to 30 days from now
 * and the status is still `Active`).
 *
 * For each expiring dispensation, notifies the related holders.
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
