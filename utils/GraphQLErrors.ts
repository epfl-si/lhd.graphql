const apolloBuiltInErrors = {
	GRAPHQL_PARSE_FAILED:         "The operation string contains a syntax error",
	GRAPHQL_VALIDATION_FAILED:    "The operation is not valid against the server’s schema",
	BAD_USER_INPUT:               "The operation includes an invalid value for a field argument",
	BAD_REQUEST:                  "The operation includes invalid variables",
}

const parseStackTrace = [
	{
		key: "Unique constraint failed",
		message: 'An element with this name appears to already exist'
	},
	{
		key: "Foreign key constraint failed",
		message: 'Is not possible to perform this action because of some relationship'
	},
]
function findGeneralErrorInMessage (err) {
	let errorMessage = '';
	const stackTraceParserItem = parseStackTrace.find(ep => err.indexOf(ep.key) > -1);
	if (stackTraceParserItem) {
		errorMessage = stackTraceParserItem.message;
	}
	return errorMessage;
}

function checkStacktrace (error) {
	let errorMessage = '';
	error.extensions.stacktrace.forEach(err => {
		if (errorMessage === '') {
			errorMessage = findGeneralErrorInMessage(err);
		}
	});
	if (errorMessage === '') {
		errorMessage = findGeneralErrorInMessage(error.message);
	}
	return errorMessage;
}

export function getErrorMessage(error) {
	const parsedError = checkStacktrace(error);
	if (parsedError !== '') {
		return parsedError;
	}
	const errorCode = error.extensions.code as string;
	let errorMessage = errorCode in apolloBuiltInErrors ? apolloBuiltInErrors[errorCode] : 'Internal Server Error';
	errorMessage = errorMessage.concat(`: ${error.message}`);
	return errorMessage;
}
