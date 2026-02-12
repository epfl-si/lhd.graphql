/**
 *  Split and sanitize a URL-encoded search string.
 *
 *   For instance,
 *        sanitizeSearchString("CAS=12345&name=antimony&status=act",
 *               {
 *                  CAS: { rename: "whereCAS", validate: /^[1-9-]*$/ },
 *                  name: { rename: "whereName", validate: /^[a-zA-Z-]*$/ },
 *                  status: { rename: "isActive", validate(untrustedStatus) {
 *                    return 'active'.toLowerCase().indexOf(untrustedStatus.toLowerCase()) > -1;
 *                      }
 *                  }
 *               })
 *   returns
 *
 *        {
 *          whereCAS: "12345",
 *          whereName: "antimony",
 *          isActive: true
 *        }
 *
 * @param searchString
 * @param spec The specification of how the fields should be validated, and optionally renamed.
 */
export function sanitizeSearchString (searchString: string, spec: {[k: string]: {rename ?: string, validate: RegExp | ((value: string) => any)}}) {
	const queryArray = searchString.split("&");
	const dictionary = queryArray.map(query => query.split("="));

	const ret = {};
	const errors = [];

	dictionary.forEach(query => {
		const key = query[0];
		if (! spec[key]) return;  // key is now trusted

		const value = decodeURIComponent(query[1]);
		const validator = spec[key].validate;
		const renamedKey = spec[key].rename ?? key;
		if (validator instanceof RegExp) {
			const matched = value.match(validator)
			if (matched) {
				ret[renamedKey] = matched[0];
			} else {
				errors.push(key);
			}
		} else if (validator instanceof Function) {
			try {
				ret[renamedKey] = validator(value);
			} catch (e) {
				errors.push(key);
			}
		}
	})
	if (errors.length) throw new Error(errors.join(', '));

	return ret;
}
