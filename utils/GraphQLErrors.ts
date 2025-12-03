const wellKnowsErrors = {
	GRAPHQL_PARSE_FAILED:         "The operation string contains a syntax error",
	GRAPHQL_VALIDATION_FAILED:    "The operation is not valid against the server’s schema",
	BAD_USER_INPUT:               "The operation includes an invalid value for a field argument",
	BAD_REQUEST:                  "The operation includes invalid variables",
	P2003:                        'Is not possible to perform this action because of some relationship',
	P2002:                        'An element with this name appears to already exist',
	FNP:                          'Filename not permitted'
}

/**
 * Format error results for Nexus
 * @param formattedError passed to the Apollo formatError callback: https://www.apollographql.com/docs/apollo-server/data/errors#for-client-responses
 * @param error The original exception
 */
export function formatErrorForNexus(formattedError, error) {
	const {errorCode, errorMessage} = getFormattedError(error, formattedError);
	return {errorCode, errorMessage};
}

/**
 * Format error results for API
 * @param formattedError
 */
export function getFormattedError(error, formattedError = undefined) {
	const errorCode = (error?.originalError?.code || formattedError?.extensions?.code || formattedError?.code) as string;
	const errorMessage = errorCode in wellKnowsErrors ? wellKnowsErrors[errorCode] : (error.message || 'Internal Server Error');
	const httpCode = error.httpCode ?? (errorMessage === 'Unauthorized' ? 403 : 500);
	return {errorCode, errorMessage, httpCode};
}


export class NotFoundError extends Error {
	public httpCode: number;

	constructor(...args) {
		super(...args);
		this.httpCode = 404;
	}
}
