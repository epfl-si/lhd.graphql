import {Request} from "express-serve-static-core";
import {ParsedQs} from "qs";
import {Issuer} from "openid-client";
import {UserInfo} from "../serverTypes";

export function getBearerToken(req: Request<{}, any, any, ParsedQs, Record<string, any>>): string {
	const matched = req.headers.authorization?.match(/^Bearer\s(.*)$/);
	if (!matched) return undefined;
	else return matched[1];
}

let _issuer: Issuer | undefined = undefined;

async function issuer() {
	if (_issuer) return _issuer;

	_issuer = await Issuer.discover(
		process.env.OIDC_BASE_URL || 'http://localhost:8080/realms/LHD'
	);

	return _issuer;
}

export async function authenticateFromBarerToken(req): Promise<object> {
	async function getUserAuthentication(access_token: string) {
		const issuer_ = await issuer();
		const client = new issuer_.Client({ client_id: 'LHDv3 server' });

		const user: UserInfo = await client.userinfo(access_token);
		const allowedGroups = process.env.ALLOWED_GROUPS.split(',');
		console.log('Logged in', user);
		console.log('Allowed groups', allowedGroups);

		if (!(user.groups && user.groups.some(e => allowedGroups.includes(e)))) {
			throw new Error('Wrong access rights');
		}

		if (!user.username)
			user.username = user.preferred_username;

		const hasRoleAdmin = user.groups.indexOf(process.env.ADMIN_GROUP) > -1;
		const hasRoleManager = user.groups.indexOf(process.env.LHD_GROUP) > -1;
		const hasRoleManagerOrAdmin = hasRoleAdmin || hasRoleManager;
		const hasRoleCosec = user.groups.indexOf(process.env.COSEC_GROUP) > -1;

		user.isAdmin = hasRoleAdmin;
		user.isManager = hasRoleManager;
		user.isCosec = hasRoleCosec;

		user.canListRooms =
			user.canEditRooms =
				user.canListHazards =
					user.canEditHazards =
						user.canListUnits =
							user.canEditUnits =
								user.canListReportFiles =
									user.canListChemicals =
										user.canEditChemicals =
											user.canListAuthorizations =
												user.canEditAuthorizations =
													user.canListPersons =
														user.canEditOrganisms = hasRoleManagerOrAdmin;
		user.canListOrganisms = hasRoleManagerOrAdmin || hasRoleCosec;

		return user;
	}

	const matched = getBearerToken(req);
	if (!matched) {
		throw new Error("Unauthorized");
	}
	return await getUserAuthentication(matched);
}
