import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {sendEmailForAuthorization} from "../utils/Email/Mailer";
import {EMAIL_TEMPLATES} from "../utils/Email/EmailTemplates";
import {getExpiringAuthorizations} from "../model/authorization";

const userInfo = {
	username: 'LHD-cron',
	userFullName: 'LHD-cron',
	userEmail: process.env.CRONJOBS_EMAIL ?? '',
	canEditAuthorizations: true
};
const prisma = getPrismaForUser(configFromDotEnv(), userInfo);

async function notifyExpiringAuthorizations () {
	const expiringDisps =  await getExpiringAuthorizations(prisma);
	for (const disp of expiringDisps) {
		await sendEmailForAuthorization(disp.modified_by, userInfo.userEmail, disp, EMAIL_TEMPLATES.EXPIRING_AUTHORIZATION);
	}
}

notifyExpiringAuthorizations();
