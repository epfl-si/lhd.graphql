import {getNow} from "../../libs/date";
import {Request} from "express";
import {getPrismaForUser} from "../../libs/auditablePrisma";
import {configFromDotEnv} from "../../libs/config";

export function auditAPI (req, res, next) {
	console.log(`API CALL - [${getNow()}] - ${req.method} - ${req.protocol}://${req.hostname}${req.originalUrl}`);

	next();
}

export function setReqPrismaMiddleware (req: Request, _res, next) {
	req.prisma = getPrismaForUser(configFromDotEnv(), req.user);

	next();
}
