import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {sendEmailForAuthorization} from "../utils/Email/Mailer";
import {EMAIL_TEMPLATES} from "../utils/Email/EmailTemplates";
import {expireAuthorization, getExpiredAuthorizations} from "../model/authorization";

const userInfo = {
	username: 'CronJobs',
	userFullName: 'CronJob',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditAuthorizations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), userInfo);

async function expireAndNotifyAuthorizations () {
	const expiredAuths =  await getExpiredAuthorizations(prisma);
	for (const auth of expiredAuths) {
		await prisma.$transaction(async (tx) => {
			const updated = await expireAuthorization(tx, auth);
			await sendEmailForAuthorization(userInfo.userFullName, userInfo.userEmail, updated, EMAIL_TEMPLATES.EXPIRED_AUTHORIZATION);
		},{
			maxWait: 10000, // Max time (ms) to wait for a transaction slot (default: 2000)
			timeout: 30000, // Max time (ms) the transaction can run (default: 5000)
		});
	}
}

expireAndNotifyAuthorizations();
