import {Request} from "express-serve-static-core";
import {ParsedQs} from "qs";

export function getBearerToken(req: Request<{}, any, any, ParsedQs, Record<string, any>>): string {
	const matched = req.headers.authorization?.match(/^Bearer\s(.*)$/);
	if (!matched) return undefined;
	else return matched[1];
}
