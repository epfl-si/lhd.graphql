import { Request, Response, NextFunction } from 'express';
import {getFormattedError} from "../../utils/GraphQLErrors";

/**
 * Global error-handling middleware.
 */
export function errorHandler(
	err: unknown,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	console.error("API error: ", err);
	res.status(500).json({error: getFormattedError(err)});
}
