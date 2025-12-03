/**
 * Authentication for the third-party REST API (ServiceNow, Catalyse)
 */
import {Request} from "express";
import {getBearerToken} from "../../libs/authentication";

export function getTokenFromQueryString(req: Request): string {
	return req.query.token ? String(req.query.token) : undefined;
}

export function getToken(req: Request): string {
	return getTokenFromQueryString(req) ?? getBearerToken(req);
}
