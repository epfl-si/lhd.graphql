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

export async function authenticateFromBearerToken(req): Promise<object> {
	const access_token = getBearerToken(req);
	if (!access_token) {
		throw new Error("Unauthorized");
	}

	await checkTokenValid(access_token);

	const authenticationResult = parseJwt(access_token);

	const userGroups = authenticationResult.groups;
	const allowedGroups = process.env.ALLOWED_GROUPS.split(',');
	if (!(userGroups && userGroups.some(e => allowedGroups.includes(e)))) {
		throw new Error("Unauthorized");
	}

	const user: UserInfo = {
		groups: userGroups,
		username: ( authenticationResult.unique_name ||
			authenticationResult.gaspar )  // EPFL-ism in Entra
	};
	console.log('Logged in', user);
	console.log('Allowed groups', allowedGroups);

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
		user.canListDispensations =
		user.canEditDispensations =
		user.canListPersons =
		user.canEditOrganisms =
		user.canListForms = hasRoleManagerOrAdmin;
	user.canListOrganisms = hasRoleManagerOrAdmin || hasRoleCosec;

	return user;
}

function parseJwt (access_token: string) {
	return JSON.parse(Buffer.from(access_token.split('.')[1], 'base64').toString());
}

const getJwksUri = (() => {
	let cachedJwksUri;
	return async function getJwksUri () {
		if (! cachedJwksUri) {
			if (process.env.OIDC_KEYS_URL) {
				cachedJwksUri = process.env.OIDC_KEYS_URL;
			} else {
				const response = await fetch(`${process.env.OIDC_BASE_URL}/.well-known/openid-configuration`);
				const wellKnown = await response.json();
				cachedJwksUri = wellKnown.jwks_uri;
			}
		}
		return cachedJwksUri;
	 }
})();

async function checkTokenValid(access_token: string) {
	const client = jwksClient({ jwksUri: await getJwksUri() });

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
