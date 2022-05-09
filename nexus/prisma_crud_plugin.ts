/**
 * Homemade Prisma CRUD plug-in for Nexus
 *
 * Replaces the `t.crud` subset of what
 * [nexus-plugin-prisma](https://github.com/kenchi/nexus-plugin-prisma)
 * does, or used to do.
 *
 * Currently implemented in terms of the very thing we want to get rid of :-P
 */

import { plugin as NexusPlugin, dynamicOutputProperty } from 'nexus';
import { DynamicOutputPropertyDef } from 'nexus/dist/dynamicProperty';
import { build as buildNexusPrismaTypes } from '@kenchi/nexus-plugin-prisma/dist/builder';

import { debug as debug_ } from 'debug';
const debug = debug_('lhd:prisma_crud_plugin');

export type Options = { shouldGenerateArtifacts?: boolean };
export function NexusPrismaCRUDPlugin(opts: Options = {}) {
	const { shouldGenerateArtifacts } = opts;

	return NexusPlugin({
		name: 'NexusPrismaCRUDPlugin',
		onInstall: nexusBuilder => {
			debug(`I'm in ur onInstall...`);
			const { types } = buildNexusPrismaTypes({
				nexusBuilder,
				experimentalCRUD: true,
				shouldGenerateArtifacts,
			});

			// Drop the `.model()` part, that we don't use:
			const crud = types[0] as DynamicOutputPropertyDef<'crud'>;
			nexusBuilder.addType(tweakCrud(crud));
		},
	});
}

function tweakCrud(
	crud: DynamicOutputPropertyDef<'crud'>
): DynamicOutputPropertyDef<'crud'> {
	debug(`... tweaking your CRUD!`);
	// Actually we aren't changing a thing (for now). But we could

	const constructorParams: Parameters<typeof dynamicOutputProperty>[0] = (
		crud as any
	).config;
	return dynamicOutputProperty<'crud'>({
		name: 'crud',
		typeDescription: `
            Add CRUD (Create, Read, Update, Delete) queries and mutations for a Prisma-generated type.
`,
		typeDefinition: constructorParams.typeDefinition,
		factory({ typeDef, typeName, stage, builder }) {
			debug(`Now I'm in your factory! ${typeName} ${typeDef} ${stage} ${builder}`);
			const retval = constructorParams.factory({
				typeDef,
				typeName,
				stage,
				builder,
			});
			return retval;
		},
	});
}
