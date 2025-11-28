const wellKnowsErrors = {
	GRAPHQL_PARSE_FAILED:         "The operation string contains a syntax error",
	GRAPHQL_VALIDATION_FAILED:    "The operation is not valid against the server’s schema",
	BAD_USER_INPUT:               "The operation includes an invalid value for a field argument",
	BAD_REQUEST:                  "The operation includes invalid variables",
	P2003:                        'Is not possible to perform this action because of some relationship',
	P2002:                        'An element with this name appears to already exist',
	FNP:                          'Filename not permitted'
}

export function getFormattedError(formattedError, error = undefined) {
	const errorCode = (error?.originalError?.code || formattedError.extensions?.code || formattedError.code) as string;
	const errorMessage = errorCode in wellKnowsErrors ? wellKnowsErrors[errorCode] : 'Internal Server Error';
	return {errorCode, errorMessage};
}
