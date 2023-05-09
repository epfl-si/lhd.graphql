import { objectType, extendType, nonNull, intArg, stringArg } from 'nexus';

type MutationStatusTypeArgs<TypeName extends string> = {
  name: TypeName
  definition ?: Parameters<typeof objectType<TypeName>>[0]['definition']
}

/**
 * Like `objectType` from `nexus`, except it comes pre-populated
 * with `isSuccess` and `errors` fields - The latter matching what
 * Nexus itselfs serves in case of an error.
 *
 * You can add more fields by passing your own `definition()` function,
 * like you would to an ordinary Nexus `objectType` call.
 */
export function mutationStatusType<TypeName extends string> (args : MutationStatusTypeArgs<TypeName>) {
  const { name, definition } = args

  return objectType({
    name,
    definition(t : DefinitionBuilder) {
      t.nonNull.boolean('isSuccess')
      t.list.nonNull.field('errors', { type: GraphQLError })
      if (definition) definition(t)
    }
  })

  // Giving a proper type for `DefinitionBuilder` is a bit of a
  // conundrum. If we just let Nexus do its thing (i.e. by letting the
  // type of `t` above, be inferred), it would whine about those
  // `isSuccess` and `errors` fields that it doesn't know about. Using
  // “any” below is a cop-out for typing this here function, but at
  // least it doesn't “escape” i.e. our callers *will* properly be
  // type-checked at compile time. TODO: study Nexus code to find out
  // whether there is a better way using its non-generated exported
  // types. (Hint: the name DefinitionBuilder was actually picked from
  // there.)
  type DefinitionBuilder = any
}

mutationStatusType.error = function (message : string) : MutationStatus {
  return { isSuccess: false, errors: [{ message }] }
}

mutationStatusType.success = function () : MutationStatus {
  return { isSuccess: true }
}

/**
 * Mirrors the error responses that Nexus synthesises in case of an
   exception occurring while handling a GraphQL request.
 */

export const GraphQLError = objectType({
  name: "GraphQLError",
  definition(t) {
    t.string("message")
    t.field("extensions", { type: "GraphQLErrorExtension" })
  }
});

export const GraphQLErrorExtension = objectType({
  name: "GraphQLErrorExtension",
  definition(t) {
    t.string("code")
    t.field("exception", { type: "GraphQLException" })
  }
})

export const GraphQLException = objectType({
  name: "GraphQLException",
  definition(t) {
    t.list.nonNull.string("stacktrace")
  }
});


export interface MutationStatus {
  isSuccess: boolean
  errors ?: [GraphQLError]
}

export interface GraphQLError {
  message: string
  extensions ?: GraphQLErrorExtension
}

export interface GraphQLErrorExtension {
  code ?: string
  exception ?: GraphQLException
}

export interface GraphQLException {
  stacktrace: string[]
}
