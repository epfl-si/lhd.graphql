import {
	alphanumericRegexp,
	casRegexp,
	dbNamesRegexp,
	dispensationTicketRegexp, emailRegexp, fileContentRegexp, fileNameRegexp,
	roomNameRegexp
} from "../api/lib/lhdValidators";
import {acceptInteger, sanitizeObject} from "./fieldValidatePlugin";

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
 * @param keepUnknownKeys Used for dynamic objects (like hazards)
 */
export function sanitizeSearchString (searchString: string, spec: {[k: string]: {rename ?: string, validate: RegExp | ((value: string) => any)}}, keepUnknownKeys: boolean = false) {
	const queryArray = searchString.split("&");
	const dictionary = queryArray.map(query => query.split("="));

	const ret = {};
	const errors = [];

	dictionary.forEach(query => {
		const key = query[0];
		const value = decodeURIComponent(query[1]);

		if (key === '') return;

		if (! spec[key]) {
			if (! keepUnknownKeys) return;  // key is now trusted
			else {
				const matched = value.match(alphanumericRegexp)
				if (matched) {
					ret[key] = matched[0];
				} else {
					errors.push(key);
				}
				return;
			}
		}

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

export function sanitizeMutationTypes (values: {status: string, name?: string, id?: number}[]) {
	if (!values) return [];

	values.forEach(val => {
		if (!val.name && !val.id) {
			throw new Error("Name and id both undefined");
		}
		if (val.name && !alphanumericRegexp.test(val.name)) {
			throw new Error("Invalid name");
		}
		if (!["New", "Default", "Deleted"].includes(val.status)) {
			throw new Error("Invalid status");
		}
	});
	return values;
}

export function sanitizeHolderMutationTypes (values: {status: string, sciper: number}[]) {
	if (!values) return [];

	values.forEach(val => {
		if (!["New", "Default", "Deleted"].includes(val.status)) {
			throw new Error("Invalid status");
		}
	});
	return values;
}

export function sanitizeCasMutationTypes (values: {status: string, name: string}[]) {
	if (!values) return [];

	values.forEach(val => {
		if (val.name && !casRegexp.test(val.name)) {
			throw new Error("Invalid cas");
		}
		if (!["New", "Default", "Deleted"].includes(val.status)) {
			throw new Error("Invalid status");
		}
	});
	return values;
}

export function sanitizeTicketMutationTypes (values: {status: string, name: string}[]) {
	if (!values) return [];

	values.forEach(val => {
		if (val.name && !dispensationTicketRegexp.test(val.name)) {
			throw new Error("Invalid ticket number");
		}
		if (!["New", "Default", "Deleted"].includes(val.status)) {
			throw new Error("Invalid status");
		}
	});
	return values;
}

export function sanitizeDBNames (value: string) {
	if (!value) return [];

	const values = value.split(',');
	values.forEach(val => {
		if (val && !dbNamesRegexp.test(val)) {
			throw new Error("Invalid db name");
		}
	});
	return values;
}

export function sanitizeRoomsNames (value: string) {
	if (!value) return [];

	const values = value.split(',');
	values.forEach(val => {
		if (val && !roomNameRegexp.test(val)) {
			throw new Error("Invalid room name");
		}
	});
	return values;
}

export function sanitizePersonMutationTypes (values: {status: string, person: {sciper: number, name: string, surname: string, type?: string, email?: string}}[]) {
	if (!values) return [];

	values.forEach(val => {
		if (val.person && val.person.email && !emailRegexp.test(val.person.email)) {
			throw new Error("Invalid email");
		}
		if (!["New", "Default", "Deleted"].includes(val.status)) {
			throw new Error("Invalid status");
		}
	});
	return values;
}
