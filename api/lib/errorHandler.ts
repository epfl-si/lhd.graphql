import { Request, Response, NextFunction } from 'express';

/**
 * Global error-handling middleware.
 */
export function errorHandler(
	err: unknown,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	const message = err instanceof Error ? err.message : 'Internal Server Error';
	res.status(500).json({error: message});
}
