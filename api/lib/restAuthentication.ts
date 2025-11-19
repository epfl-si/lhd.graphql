import {Request} from "express";
import {getBearerToken} from "../../libs/authentication";

export function restAuthenticate(req: Request, res, next) {
	const token = getToken(req);
	const isSnow = token === process.env.SNOW_TOKEN;
	const isCatalyse = token === process.env.CATALYSE_TOKEN;

	if (!isSnow && ! isCatalyse) {
		res.status(403);
		res.send(`Unauthorized`);
		return;
	}

	req.user = {
		username: isSnow ? 'SNOW' : 'CATALYSE',
		canListRooms: isSnow,
		canListUnits: isSnow,
		canListChemicals: isSnow,
		canEditChemicals: isSnow,
		canListAuthorizations: isCatalyse,
		canEditAuthorizations: isSnow
	}

	next();
}

export function getTokenFromQueryString(req: Request): string {
	return req.query.token ? String(req.query.token) : undefined;
}

export function getToken(req: Request): string {
	return getTokenFromQueryString(req) ?? getBearerToken(req);
}
