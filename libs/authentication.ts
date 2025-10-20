import {Request} from "express-serve-static-core";
import {ParsedQs} from "qs";

export const VALID_TOKENS_FOR_API = {
	'SNOW': process.env.SNOW_TOKEN,
	'CATALYSE': process.env.CATALYSE_TOKEN
};

export function getToken(req: Request<{}, any, any, ParsedQs, Record<string, any>>): string {
	if (req.query.token)
		return String(req.query.token);

	const matched = req.headers.authorization?.match(/^Bearer\s(.*)$/);
	if (!matched)
		throw new Error(`Unauthorized`)
	else return matched[1];
}
