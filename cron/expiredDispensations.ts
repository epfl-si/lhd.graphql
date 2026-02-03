import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {expireDispensation, getDispensation, getExpiredDispensations} from "../model/dispensation";
import {sendEmailForDispensation} from "../utils/Email/Mailer";
import {EMAIL_TEMPLATES} from "../utils/Email/EmailTemplates";

const cronUser = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditDispensations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), cronUser);

async function expireAndNotifyDispensations () {
	const expiredDisps =  await getExpiredDispensations(prisma);
	for (const disp of expiredDisps) {
		await prisma.$transaction(async (tx) => {
			await expireDispensation(tx, disp, cronUser);
			const updated = await getDispensation(tx, disp.id_dispensation);
			await sendEmailForDispensation(cronUser.userFullName, cronUser.userEmail, updated, EMAIL_TEMPLATES.EXPIRED_DISPENSATION);
		},{
			maxWait: 10000, // Max time (ms) to wait for a transaction slot (default: 2000)
			timeout: 30000, // Max time (ms) the transaction can run (default: 5000)
		});
	}
}

expireAndNotifyDispensations();
