import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {expireDispensation, getDispensation, getExpiringDispensations} from "../model/dispensation";
import {sendEmailForDispensation} from "../utils/Email/Mailer";

const cronUser = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditDispensations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), cronUser);

/**
 * Checks for all expired dispensations (where `date_end` is earlier
 * than today and the status is still `Active`).
 *
 * For each expired dispensation, updates its status to `Expired` and notifies
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
