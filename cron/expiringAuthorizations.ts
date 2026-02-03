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

async function notifyExpiringAuthorizations () {
	const expiringDisps =  await getExpiringAuthorizations(prisma);
	for (const disp of expiringDisps) {
		await sendEmailForAuthorization(disp.modified_by, cronUser.userEmail, disp, EMAIL_TEMPLATES.EXPIRING_AUTHORIZATION);
	}
}

notifyExpiringAuthorizations();
