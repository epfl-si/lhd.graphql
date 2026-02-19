import type {GraphQLResolveInfo} from 'graphql'
import {printedGenTyping, printedGenTypingImport} from 'nexus/dist/utils'
import {ArgsValue, GetGen, MaybePromise, SourceValue} from "nexus/dist-esm/typegenTypeHelpers";
import {plugin} from "nexus";

const ValidateResolverImport = printedGenTypingImport({
	module: 'nexus/dist/plugins/fieldValidatePlugin',
	bindings: ['FieldValidateResolver'],
})

const fieldDefTypes = printedGenTyping({
	optional: true,
	name: 'validate',
	description: `
    Validation for an individual field. Returning "true"
    or "Promise<true>" means the field is valid.
    Returning "false" or "Promise<false>" will respond
    with a "Not Validated" error for the field. 
    Returning or throwing an error will also prevent the 
    resolver from executing.
  `,
	type: 'FieldValidateResolver<TypeName, FieldName>',
	imports: [ValidateResolverImport],
})

export type FieldValidateResolver<TypeName extends string, FieldName extends string> = (
	root: SourceValue<TypeName>,
	args: ArgsValue<TypeName, FieldName>,
	context: GetGen<'context'>,
	info: GraphQLResolveInfo
) => MaybePromise<boolean | Error>

export interface FieldValidatePluginErrorConfig {
	error: Error
	root: any
	args: any
	ctx: GetGen<'context'>
	info: GraphQLResolveInfo
}

export interface FieldValidatePluginConfig {
	formatError?: (authConfig: FieldValidatePluginErrorConfig) => Error
}

export const defaultFormatError = ({ error }: FieldValidatePluginErrorConfig): Error => {
	const err: Error & { originalError?: Error } = new Error(error.message)
	err.originalError = error
	return err
}

export const fieldValidatePlugin = (authConfig: FieldValidatePluginConfig = {}) => {
	const { formatError = defaultFormatError } = authConfig
	const ensureError =
		(root: any, args: any, ctx: GetGen<'context'>, info: GraphQLResolveInfo) => (error: Error) => {
			const finalErr = formatError({ error, root, args, ctx, info })
			if (finalErr instanceof Error) {
				throw finalErr
			}
			throw new Error(`Non-Error value ${finalErr} returned from custom formatError in validate plugin`)
		}
	let hasWarned = false
	return plugin({
		name: 'NexusValidate',
		description: 'The validate plugin provides validation for arguments.',
		fieldDefTypes: fieldDefTypes,
		onCreateFieldResolver(config) {
			const validate = config.fieldConfig.extensions?.nexus?.config.validate
			// If the field doesn't have a validate field, don't worry about wrapping the resolver
			if (!validate) {
				console.log("WARNING: unvalidated Nexus query!")
				return
			}

			// If they have it, but didn't explicitly specify a plugins array, warn them.
			if (!config.schemaConfig.plugins?.find((p) => p.config.name === 'NexusValidate')) {
				if (!hasWarned) {
					console.warn(
						'The GraphQL Nexus "validate" feature has been moved to a plugin, add [fieldValidatePlugin()] to your makeSchema plugin config to remove this warning.'
					)
					hasWarned = true
				}
			}
			// The validate wrapping resolver.
			return function (root, args, ctx, info, next) {
				try {
					const validatedArgs = {};
					const errors = [];
					for (const key in validate) {
						if (validate[key] instanceof Function) {
							try {
								validatedArgs[key] = validate[key](args[key])
							} catch (e) {
								errors.push(e.message);
							}
						} else if (validate[key] instanceof RegExp) {
							try {
								validatedArgs[key] = acceptRegexp(args[key], validate[key]);
							} catch (e) {
								errors.push(e.message);
							}
						} else if (isStringArray(validate[key])) {
							try {
								validatedArgs[key] = acceptSubstringInList(args[key], validate[key]);
							} catch (e) {
								errors.push(e.message);
							}
						} else if (isCustomEnumerator(validate[key])) {
							try {
								validatedArgs[key] = acceptEnum(args[key], validate[key].enum);
							} catch (e) {
								errors.push(e.message);
							}
						} else {
							throw new Error(`Validator for ${key} not valid`);
						}
					}
					if (errors.length > 0) {
						throw new Error(`Value not valid for: ${errors.join(', ')}`);
					}

					return next(root, validatedArgs, ctx, info);
				} catch ( err ) {
					ensureError(root, args, ctx, info)(err);
				}
			}
		},
	})
}

export const acceptInteger = (i) => {
	if (typeof(i) !== 'number') throw new Error(`Bad type: ${typeof(i)}, expected number`);
	return i;
}

export const acceptNumberFromString = (i) => {
	if (!i || isNaN(parseFloat(i))) throw new Error(`Bad type: ${typeof(i)}, expected number`);
	return parseFloat(i);
}

export const acceptBoolean = (i) => {
	if (typeof(i) !== 'boolean') throw new Error(`Bad type: ${typeof(i)}, expected boolean`);
	return i;
}

export const acceptDate = (i) => {
	if (!(i instanceof Date)) throw new Error(`Bad type: ${typeof(i)}, expected Date`);
	return i;
}

export const acceptDateString = (i) => {
	const dateRegexp = new RegExp('^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\\d{4}$');
	if (!dateRegexp.test(i)) throw new Error(`Bad format for ${i}`);

	const [dayCrea, monthCrea, yearCrea] = i.split("/").map(Number);
	return new Date(yearCrea, monthCrea - 1, dayCrea, 12);
}

export const acceptRegexp = (i: string, regex: RegExp) => {
	if (!regex.test(i)) throw new Error(`Bad format for ${i}`);
	return i;
}

export const acceptSubstringInList = (i: string, availableItems: string[]) => {
	const keyword = availableItems
		.find(status => status.toLowerCase().includes(i.toLowerCase()));
	if (keyword === undefined) throw new Error(`Not in ${availableItems.join(', ')}`);
	return keyword;
}

export const acceptEnum = (i: string, availableItems: string[]) => {
	if (!availableItems.includes(i)) throw new Error(`Not in ${availableItems.join(', ')}`);
	return i;
}

const isCustomEnumerator = (value) => {
	return (
		typeof value === "object" &&
		value !== null &&
		"enum" in value &&
		Array.isArray((value as any).enum) &&
		(value as any).enum.every(item => typeof item === 'string')
	)
}

const isStringArray = (value) => {
	return (
		Array.isArray(value as any) &&
		(value as any).every(item => typeof item === 'string')
	)
}

export const acceptJson = (i: string) => {
	try {
		JSON.parse(i);
		return i;
	} catch (e) {
		throw new Error(`Bad format for ${i}`);
	}
}

export function sanitizeObject (obj: any, spec: {[k: string]: {	rename ?: string,
		validate?: RegExp | ((value: string) => any) | {enum: string[]}
		optional?: boolean
}}) {
	const ret = {};
	const errors = [];

	const objKeys = Object.keys(obj);
	objKeys.forEach(key => {
		if (! spec[key]) return;  // key is now trusted

		const validator = spec[key].validate;
		const renamedKey = spec[key].rename ?? key;
		if (validator) {
			if (spec[key].optional && !obj[key]) return;  // No error, the field is undefined as it's optional

			if (validator instanceof RegExp) {
				const matched = obj[key].match(validator)
				if (matched) {
					ret[renamedKey] = matched[0];
				} else {
					errors.push(key);
				}
			} else if (validator instanceof Function) {
				try {
					ret[renamedKey] = validator(obj[key]);
				} catch (e) {
					errors.push(key);
				}
			} else if (isCustomEnumerator(validator)) {
				try {
					ret[renamedKey] = acceptEnum(obj[key], validator[key].enum);
				} catch (e) {
					errors.push(key);
				}
			}
		}
	})
	if (errors.length) throw new Error(errors.join(', '));

	return ret;
}

export function sanitizeArray (arr: any[], spec: {[k: string]: {rename ?: string, validate: RegExp | ((value: string) => any) | {enum: string[]}}}) {
	return arr.map(item => sanitizeObject(item, spec));
}
