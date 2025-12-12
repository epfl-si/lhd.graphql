/**
 * Authentication for the third-party REST API (ServiceNow, Catalyse)
 */
import {Request} from "express";
import {getBearerToken} from "../../libs/authentication";

function getTokenFromQueryString(req: Request, parameterName: string): string {
	return req.query[parameterName] ? String(req.query[parameterName]) : undefined;
}

export function getToken(req: Request, parameterName: string): string {
	return getTokenFromQueryString(req, parameterName) ?? getBearerToken(req);
}
