import {Request, Response} from "express-serve-static-core";
import {ParsedQs} from "qs";

export function getToken(req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>, number>): string | undefined {
	if (req.query.token) {
		return String(req.query.token);
	} else if (req.body && req.body.token) {
		return String(req.body.token);
	} else {
		return "";
	}
}

function verifyToken(token: string, hash: string): boolean {
	return token === hash; //await bcrypt.compare(token, hash);
}

export function authenticate(token: string) {
	const hash = process.env.SNOW_TOKEN;
	if (hash === 'DEV') {
		return true;
	}
	return verifyToken(token, hash);
}
