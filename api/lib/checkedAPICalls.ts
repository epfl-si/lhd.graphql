export class ValidationError extends Error {}
type ValidatorType = typeof Number | typeof Date | RegExp | ((paramValue : string) => any);

/**
 * Higher-order Express middleware that enforces authorization and parameter validation.
 *
 * @param authorize A function that takes `req` as a parameter, and returns `true` if access is granted.
 * @param required The list of required parameters, each as a function that extracts it from `req`. `checkAPICall` will signal an error whenever one of these functions returns undefined.
 * @param optional The list of optional parameters, each as a function that extracts it from `req`.
 * @param validate A dict of functions, each of which takes the return value of one of the `required` or `optional` value functions as a parameter, and either returns a sanitized value or throws
 *
 * @return An Express middleware that performs the checks, and sets `req.params` if successful.
 */
export function checkAPICall({authorize, required, optional, validate} : {
	authorize: (req) => boolean | Promise<boolean>,
	required?: { [paramName : string] : (req) => string | undefined },
	optional?: { [paramName : string] : (req) => string | undefined },
	validate: { [paramName : string] : ValidatorType },
}) {
	return async function(req, res, next) { // Express middleware
		if (! await authorize(req)) {
			res.status(403).json({Message: "Unauthorized"});
			return;
		}

		const params = {}, validationErrors=[];
		for (const param of Object.keys(validate || {})) {
			let toValidate: string;
			if (required && required[param]) {
				toValidate = required[param](req);
				if (toValidate === undefined) {
					validationErrors.push({param, error: 'is required'});
					continue;
				}
			} else if (optional && optional[param]) {
				toValidate = optional[param](req);
				if (toValidate === undefined) {
					continue;  // Missing optional parameter, that's okay
				}
			} else {
				// Gratuitous parameter that is not gettable (perhaps because
				// someone passed in a validation object bigger than required?)
				throw new Error("Don't know how to get " + param + " from request");
			}
			try {
				params[param] = ensureValid(param, toValidate, validate[param]);
			} catch ( e ) {
				validationErrors.push({param, error: e.message});
			}
		}

		function ensureValid (param: string, toValidate : string, validator: ValidatorType) : any {
			if (validator === Number) {
				const validated = Number(toValidate);
				if (isNaN(validated)) {
					throw new ValidationError(`Invalid number`);
				}
				return validated;
			} else if (validator === Date) {
				const date = new Date(toValidate);
				const validated = date.getTime();
				if (isNaN(validated)) {
					throw new ValidationError(`Invalid date`);
				}
				return date;
			} else if (validator instanceof RegExp) {
				const anchored = new RegExp(`^(?:${validator.source})$`, validator.flags);
				if (anchored.test(toValidate)) {
					return toValidate;
				} else {
					throw new ValidationError(`Failed Regex match`);
				}
			} else if (typeof  validator === "function") {
				return validator.call({
					// Available as `this.validate(...)` in the function body
					// Despite the name, has nothing to do with the `validate` named param, above
					validate: ensureValid.bind({}, param)
				}, toValidate);
			} else {
				throw new Error(`Bad validator for ${param}`);
			}
		}
		if (validationErrors.length) {
			const validationErrorsSummary = validationErrors
				.map(({param, error}) => `${param}: ${error}`)
				.join("; ");
			return res.status(400).json({Message: validationErrorsSummary});
		} else {
			req.params = params;
			next();
		}
	}
}
