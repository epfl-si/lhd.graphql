import {NextFunction, Request, Response} from 'express';
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
	const errorStruct = getFormattedError(err);
	res.status(errorStruct.httpCode).json({error: errorStruct});
}
