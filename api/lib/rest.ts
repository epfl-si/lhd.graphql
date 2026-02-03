import {getNow} from "../../libs/date";
import {Request} from "express";
import {getPrismaForUser} from "../../libs/auditablePrisma";
import {configFromDotEnv} from "../../libs/config";

export function auditAPI (req, res, next) {
	console.log(`API CALL - [${getNow()}] - ${req.method} - ${req.protocol}://${req.hostname}${req.originalUrl}`);

	next();
}

/**
 * Express middleware that attaches a user-scoped Prisma client to the request.
 *
 * This middleware creates a Prisma client using the currently authenticated
 * user (`req.user`) and stores it on `req.prisma`, making it available to all
 * downstream route handlers and middleware.
 *
 * The Prisma client is configured using environment-based backend config and
 * includes any user-specific behavior such as mutation auditing.
 *
 * @param req - Express request object; must contain an authenticated `user`.
 * @param _res - Express response object (unused).
 * @param next - Callback to pass control to the next middleware.
 */
export function setReqPrismaMiddleware (req: Request, _res, next) {
	req.prisma = getPrismaForUser(configFromDotEnv(), req.user);

	next();
}
