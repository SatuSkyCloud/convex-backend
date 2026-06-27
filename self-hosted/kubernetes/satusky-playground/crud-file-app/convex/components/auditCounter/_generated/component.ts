/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    counter: {
      count: FunctionReference<
        "query",
        "internal",
        { ownerSubject: string },
        number,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        { ownerSubject: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          message: string;
          mode: string;
          ownerSubject: string;
        }>,
        Name
      >;
      record: FunctionReference<
        "mutation",
        "internal",
        { message: string; ownerSubject: string },
        string,
        Name
      >;
    };
  };
