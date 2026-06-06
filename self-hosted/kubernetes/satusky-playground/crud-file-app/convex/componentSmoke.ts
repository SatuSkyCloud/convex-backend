import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export const recordBoth = mutation({
  args: {
    message: v.string(),
  },
  returns: v.object({
    auditAId: v.string(),
    auditBId: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const auditAId = await ctx.runMutation(components.auditA.counter.record, {
      ownerSubject: identity.subject,
      message: `auditA: ${args.message}`,
    });
    const auditBId = await ctx.runMutation(components.auditB.counter.record, {
      ownerSubject: identity.subject,
      message: `auditB: ${args.message}`,
    });
    return { auditAId, auditBId };
  },
});

export const summary = query({
  args: {},
  returns: v.object({
    auditA: v.object({
      count: v.number(),
      latestMode: v.optional(v.string()),
    }),
    auditB: v.object({
      count: v.number(),
      latestMode: v.optional(v.string()),
    }),
  }),
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    const [auditA, auditB] = await Promise.all([
      ctx.runQuery(components.auditA.counter.list, {
        ownerSubject: identity.subject,
      }),
      ctx.runQuery(components.auditB.counter.list, {
        ownerSubject: identity.subject,
      }),
    ]);
    return {
      auditA: {
        count: auditA.length,
        latestMode: auditA[0]?.mode,
      },
      auditB: {
        count: auditB.length,
        latestMode: auditB[0]?.mode,
      },
    };
  },
});
