import {Request} from "express-serve-static-core";
import {ParsedQs} from "qs";
import {UserInfo} from "../serverTypes";
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

export function getBearerToken(req: Request<{}, any, any, ParsedQs, Record<string, any>>): string {
	const matched = req.headers.authorization?.match(/^Bearer\s(.*)$/);
	if (!matched) return undefined;
	else return matched[1];
}

export async function authenticateFromBarerToken(req): Promise<object> {
	async function getUserAuthentication(access_token: string) {
		
		await checkTokenValid(access_token).catch((error) => {
			return null;
		});

		const authenticationResult = parseJwt(access_token);
		
		const userGroups = authenticationResult.groups;
		const allowedGroups = process.env.ALLOWED_GROUPS.split(',');
		if (!(userGroups && userGroups.some(e => allowedGroups.includes(e)))) {
			return null;
		}

		const user: UserInfo = {
			groups: userGroups,
			username: authenticationResult.unique_name
		};
		console.log('Logged in', user);
		console.log('Allowed groups', allowedGroups);

		if (!(user.groups && user.groups.some(e => allowedGroups.includes(e)))) {
			throw new Error('Wrong access rights');
		}

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

function parseJwt (access_token: string) {
	return JSON.parse(Buffer.from(access_token.split('.')[1], 'base64').toString());
}

async function checkTokenValid(access_token: string) {
	const client = jwksClient({
		jwksUri: process.env.OIDC_KEYS_URL,
	});

	const getKey = (header, callback) => {
		client.getSigningKey(header.kid, (err, key) => {
			if (err) return callback(err);
			const signingKey = key.getPublicKey();
			callback(null, signingKey);
		});
	}

	return new Promise((resolve,reject) =>
		jwt.verify(access_token, getKey, { 
			algorithms: ['RS256'], 
			issuer: process.env.OIDC_BASE_URL,
			audience: process.env.OIDC_CLIENT_ID
		},
		function(err,decoded) {
			return err ? reject(err) : resolve(decoded);
		}
	));
}