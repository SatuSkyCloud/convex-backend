import { v } from "convex/values";
import { env, mutation, query } from "./_generated/server";

export const record = mutation({
  args: {
    ownerSubject: v.string(),
    message: v.string(),
  },
  returns: v.id("componentEvents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("componentEvents", {
      ownerSubject: args.ownerSubject,
      message: args.message,
      mode: env.MODE,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    ownerSubject: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("componentEvents"),
      _creationTime: v.number(),
      ownerSubject: v.string(),
      message: v.string(),
      mode: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("componentEvents")
      .withIndex("by_owner_created_at", (q) => q.eq("ownerSubject", args.ownerSubject))
      .order("desc")
      .take(20);
  },
});

export const count = query({
  args: {
    ownerSubject: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("componentEvents")
      .withIndex("by_owner_created_at", (q) => q.eq("ownerSubject", args.ownerSubject))
      .collect();
    return events.length;
  },
});
