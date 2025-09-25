import {Request, Response} from "express-serve-static-core";
import {ParsedQs} from "qs";

const VALID_TOKENS = new Set([
	process.env.SNOW_TOKEN,
	process.env.CATALYSE_TOKEN
]);

export function getToken(req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>, number>): string | undefined {
	if (req.query.token) {
		return String(req.query.token);
	} else if (req.body && req.body.token) {
		return String(req.body.token);
	} else if (req.headers["authorization"] && req.headers["authorization"].startsWith("Bearer ")){
		return req.headers["authorization"].replace("Bearer ", "");
	} else {
		return "";
	}
}

export function authenticate(token: string) {
	return VALID_TOKENS.has(token);
}
