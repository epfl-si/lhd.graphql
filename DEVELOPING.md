# Getting your Bearings as a Developer

## Understand the Prisma and Nexus black magic

### Prisma (without Nexus)

[Prisma](https://www.prisma.io/) is an [IDL](https://en.wikipedia.org/wiki/Interface_description_language)-based [ORM](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping) compiler. In simple terms, it works out of the [`prisma/schema.prisma`](prisma/schema.prisma) file to provide your app with an object-oriented model of your SQL database.

To see it in action:
1. Run `npx prisma studio`
1. Edit <code>./schema/prisma.schema</code> and perform a (relatively) small change, such as renaming a column (using <code>@map("sqlColumnNameForThisField")</code>) or table (<code>@@map("sqlTableNameForThisModel")</code>)
Run <code>npx prisma studio</code> again to see your changes

💡 The `prisma/schema.prisma` is the pivot of your Prisma workflow: as a developer, you can either write that file by hand, or reverse-engineer it out of an existing database (`npx prisma db pull`). Thereafter, Prisma acts as the one-stop shop for all your SQL abstraction needs: multi-dialect OO mapping, [Ruby-on-Rails](https://rubyonrails.org/)-style schema migration and data seeding.

### Nexus (and the two Prisma plug-ins)

[Nexus](https://nexusjs.org/) is an opinionated GraphQL server built on top of [Apollo](https://www.apollographql.com/). It lets you write the GraphQL schema (types, queries, mutations) in plain JavaScript (or TypeScript) instead of having to write them in the GraphQL language.

On top of that, [nexus-plugin-prisma](https://nexusjs.org/docs/plugins/prisma/overview) provides the magic that reads most of the GraphQL schema directly out of Prisma, without you having to type it in. As it turns out, there is a [rewrite](https://github.com/graphql-nexus/nexus-plugin-prisma/issues/1039) in progress for that plug-in, and for reasons that are covered in detail in the comments of [`./nexus/schema.ts`](nexus/schema.ts) we have to use both the old and the new plug-ins.

To observe “simple” (run-time) Nexus in action:
1. Run the test suite: <pre>yarn test</pre>A green bar is expected, otherwise see in [`README.md`](README.md) regarding setting up the ssh tunnel
1. Open [`./schema/rooms.ts`](schema/rooms.ts) to take a look at what Nexus-style definitions for GraphQL types and queries look like
1. Remove  `Room.building` from the fields list next to `definition(t)` and run the test suite again with debugging on: <pre>DEBUG=lhd-tests:'*' yarn test</pre> You should now be getting GraphQL errors with messages like `Cannot query field "building" on type "Room"`
1. Don't forget to revert the change before moving on

💡 In the `./schema/rooms.ts` file we can see both the “new” Prisma plug-in in action (the line that `import`s from `'nexus-prisma'`) and the “old” one which is behind `t.crud`, which automagically takes care of querying, filtering and more for us.

### Generated typings in Nexus and Prisma

... But wait, there is more to Nexus and Prisma.

1. Fire up an IDE that understands TypeScript, such as Visual Studio Code or IntelliJ
1. Create a new file `foo.ts` anywhere and start typing<pre>import { Room } from '@prisma/client'</pre> You will get a warning regarding `Room` being unused (which you can fix by replacing `import` with `export`, if you like), but no errors
1. Replace `Room` with something that doesn't exist, e.g. `Roomzor`. Now an error appears!

There is black magic at play here: the types of `@prisma/client` aren't limited to just what came out of the `@prisma/client` NPM download. Rather, a build-time procedure (that you can run manually with `yarn codegen`; see [`package.json`](package.json)) creates additional TypeScript typings (and actually, TypeScript code as well) out of your project's Prisma schema. You can watch this mechanism at play like this:

<pre>
ls -l node_modules/.prisma/client/index.d.ts
rm node_modules/.prisma/client/index.d.ts
yarn codegen
ls -l node_modules/.prisma/client/index.d.ts
</pre>

There is an equivalent `yarn nexus:reflect` command for Nexus-generated types under `node_modules/@types/typegen-nexus*/index.d.ts`. The workflow for the latter is quite a bit more involved (as it turns out, having to read the GraphQL schema out of TypeScript code causes a nice chicken-and-egg problem on types...); therefore, you might want to peruse the additional explanations available in the comments of [`./nexus/schema.ts`](nexus/schema.ts).

## Cookbook

### Logging SQL queries

```
DEBUG=prisma:query yarn start
```

### Debugging the commands in the `scripts` section of `package.json`

The `start` and `test` scripts have explicit support for debuggability through the [`--inspect-brk` flag](https://nodejs.org/en/docs/guides/debugging-getting-started/):

```
yarn start --inspect-brk
yarn test --inspect-brk
```

Then, open Chrome and navigate to `chrome://inspect`.

As far as the other scripts (such as the `yarn codegen` steps) are concerned, the least intrusive way to pass `--inspect-brk` is through the `NODE_OPTIONS` environment variable — but be careful that you don't want to do that while using [npx](https://www.npmjs.com/package/npx) as that would cause a port conflict (whereby both `npx` itself, and then the actual debuggee you intended, would honor `NODE_OPTIONS` and try to `bind()` to the same local TCP port). You need to invoke the desired binary directly from the `./node_modules/.bin/` directory instead, e.g.

```
NODE_OPTIONS=--inspect-brk ./node_modules/.bin/prisma generate
NODE_OPTIONS=--inspect-brk ./node_modules/.bin/ts-node --transpile-only nexus/schema
```

Then, as previously, open `chrome://inspect` tab in Chrome.
