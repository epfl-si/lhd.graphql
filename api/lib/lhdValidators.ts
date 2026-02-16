import {ValidationError} from "./checkedAPICalls";
import {IDObfuscator} from "../../utils/IDObfuscator";

export const chemicalNameRegexp = new RegExp("[A-Za-z0-9\\/()*+\"%&='?\\[\\]\\{\\},\\- ]+");
export const casRegexp = new RegExp(/^[0-9][0-9-/]*[0-9]$/);
export const reqRegexp = new RegExp("[A-Z][a-zA-Z0-9.]*-[a-zA-Z0-9.]*");
export const reqRenewRegexp = new RegExp("[A-Z][a-zA-Z0-9.]*-[a-zA-Z0-9.]*-[0-9]*");
export const unitNameRegexp = new RegExp("[A-Z][A-Z-]*[A-Z]");
export const roomNameRegexp = new RegExp("[A-Z][A-Z0-9-. ]*[A-Z0-9]");
export const authRegexp = new RegExp("yes|no|1|0");
export const fileNameRegexp = new RegExp(/^[\p{L}\p{N} _\-\(\)\.]+\.[A-Za-z0-9]+$/u);
export const fileContentRegexp = new RegExp("^data:[^;]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$")
export const alphanumericRegexp = new RegExp("[a-zA-Z0-9-. ]*");

export const saltRegexp = new RegExp("[a-f0-9]+");
export const ephIdRegexp = new RegExp("[a-zA-Z0-9/+=]+");
export const obfuscatedIdValidators = {eph_id: validateEphId, salt: saltRegexp};

export function validateCommaSeparatedNumbers  (p) { return p.split(',').map(r => this.validate(r, Number)) }

export function validateCASList (p) { return p.split(',').map(r => this.validate(r, casRegexp)) }
export const singleCAS = casRegexp;

export function validateAuth (p) {
	if (!authRegexp.test(p))
		throw new ValidationError(`Failed Regex match`);
	else {
		return ['yes', '1'].indexOf(p) > -1;
	}
}

export function validateEphId (p) {
	const decodedEphId = decodeURIComponent(p);
	if (!ephIdRegexp.test(decodedEphId))
		throw new ValidationError(`Failed Regex match`);
	return decodedEphId;
}

export function validateId (i: string) {
	const id = IDObfuscator.getId(i);
	IDObfuscator.checkId(id);
	IDObfuscator.checkSalt(id);
	return i;
}
