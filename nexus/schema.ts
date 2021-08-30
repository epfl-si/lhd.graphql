/**
 * Nexus schema (exported) and typegen black magic (when run with DO_TYPEGEN=1)
 */

// There is quite a bit of black magic going on here indeed, weaving
// build-time and run-time TypeScript together; the magic is best kept
// confined in its own file. The TL;DR of it: running this here
// `schema.ts` file as a stand-alone program creates
// `node_modules/@types/typegen-nexus/index.d.ts` by side effect, and
// you want that to happen before the main program starts up (as
// otherwise it won't; instead, `../schema/**/*.ts` will fail to
// type-check).
//
// There is more to Typescript types in a Nexus project than those
// that come statically packaged out of the npm / yarn downloads; even
// more so when the Prisma plugins ¹ come into play. The
// run-time magic of methods such as [`.model.XXX()` and
// `.crud.YYY()`](https://nexusjs.org/docs/plugins/prisma/overview#recipes)
// is matched at build time by Nexus's capability to generate
// TypeScript typings from the project's metadata ², so that your IDE
// and the TypeScript runtime live in harmony (i.e. code that
// typechecks now will run smoothly later, and vice versa).
//
// This means that files such as `../schema/rooms.ts` won't type-check
// in a freshly checked-out git clone! The `yarn prepublish` hook
// takes care of straightening this out; one of the things it does
// (`yarn nexus:reflect`) is to run this here `schema.ts` file
// directly with the DO_TYPEGEN environment variable set. Constructing
// the schema with `makeSchema`, below, then has the side effect of
// creating `node_modules/@types/typegen-nexus/index.d.ts` and
// `node_modules/@types/typegen-nexus-prisma/index.d.ts` where all the
// TypeScript implementations in play (your IDE's and the run-time)
// can find them, and validate the whole source tree.
//
// Obviously this presents a chicken-and-egg problem, since this very
// `schema.ts` file imports (indirectly) `../schema/rooms.ts` et al.
// That's why `yarn nexus:reflect` runs schema.ts with `ts-node
// --transpile-only` (i.e. without type checks).
//
// ¹ Plugins, plural — There is a full-blown rewrite in progress (see
// https://github.com/graphql-nexus/nexus-plugin-prisma/issues/1039).
// For practical reasons (i.e. because the rewrite is not quite
// feature-complete yet) we have to use both the new hotness,
// https://www.npmjs.com/package/nexus-prisma and the old and busted
// version, actually a maintained fork thereof, known as
// https://www.npmjs.com/package/@kenchi/nexus-plugin-prisma .
//
// ² Said metadata consists of the Nexus types and queries written in
// the Nexus JavaScript DSL in files under `../schema/**/*.ts and
// `./queries/**/*.ts`, and the Prisma schema in
// `../prisma/schema.prisma` written in a Prisma-specific IDL
// language. The latter contains the `generator nexusPrisma` statement
// that brings the “new” plugin as a Prisma code generator, whereas
// the “old” plugin tries to do its business within the confines of
// the Nexus plug-in API and kind of oversteps them (more on that
// below)

import * as path from 'path'

import { makeSchema } from 'nexus'
// We use the old plug-in *in addition to* the new one for t.crud():
import { nexusPrisma } from '@kenchi/nexus-plugin-prisma'

import * as roomTypes from '../schema/rooms'

// No user-serviceable parts below /////////////////////////////////////////////////
//
// ... Or if you must, refer to https://github.com/graphql-nexus/nexus-plugin-prisma/issues/769#issuecomment-754279309

const shouldGenerateArtifacts = !! process.env.DO_TYPEGEN

export const schema = makeSchema({
  shouldGenerateArtifacts,
  plugins: [
    // This is the “old” @kenchi/nexus-plugin-prisma, which is implemented as a
    // Nexus plug-in (or more precisely, masquerades as one - More on that
    // below). The “new” plug-in is implemented as a Prisma code generator
    // instead (invoked by `../prisma/schema.prisma`, and therefore nowhere to be
    // seen in this here `schema.ts` file)
    nexusPrisma({
      experimentalCRUD: true,          // `.crud()` is the feature we need the
                                       // “old” plug-in for — the new one doesn't
                                       // have something equivalent yet.

      shouldGenerateArtifacts,   // So as to get `.crud.rooms() ` etc. to type-check
      // Long story short, the implementation of the `.crud.rooms()`
      // feature, as documented at
      // https://nexusjs.org/docs/plugins/prisma/overview is *not*
      // something that fits nicely within the vision of the Nexus API
      // and build-time typegen workflow — Specially the `.rooms()`
      // part. This appears to be at least part of what is alluded to
      // as “technical debt” at the top of
      // https://github.com/graphql-nexus/nexus-plugin-prisma/issues/1039,
      // and no doubt, a driving reason why they opted for a different
      // approach in the rewrite (i.e. as a Prisma code generator
      // instead of a Nexus plug-in). In the meanwhile, we have to
      // live with the knowledge that `shouldGenerateArtifacts: true`,
      // as the name implies, results in an additional typegen file
      // being generated
      // (`node_modules/@types/typegen-nexus-prisma/index.d.ts`) when
      // this script runs in DO_TYPEGEN mode.
    })
  ],
  outputs: {
    // We are here to chew gum and output typegens, and we are all out of gum.
    typegen: path.join(__dirname, '../node_modules/@types/typegen-nexus/index.d.ts')
  },

  // The actual payload (which is also useful at run-time):
  types: [roomTypes]
})
