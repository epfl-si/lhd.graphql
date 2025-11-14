export const textRegexp = new RegExp("[A-Za-z0-9\\/()*+\"%&='?\\[\\]\\{\\} ]+");
const casRegexp = new RegExp("[0-9][0-9-/]*[0-9]");
export const reqRegexp = new RegExp("[A-Z][a-zA-Z0-9.]*-[a-zA-Z0-9.]*");
export const unitNameRegexp = new RegExp("[A-Z][A-Z-]*[A-Z]");
export const roomNameRegexp = new RegExp("[A-Z][A-Z0-9-. ]*[A-Z0-9]");

export function validateCommaSeparatedNumbers  (p) { return p.split(',').map(r => this.validate(r, Number)) }

export function validateCASList (p) { return p.split(',').map(r => this.validate(r, casRegexp)) }
export const singleCAS = casRegexp;
