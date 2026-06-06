import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getActor(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return {
    subject: identity.subject,
    name: identity.name ?? identity.email ?? identity.subject,
  };
}

function assertOwner(item: { ownerSubject?: string }, subject: string) {
  if (item.ownerSubject !== subject) {
    throw new Error("Not authorized for this record");
  }
}

export const runtimeInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return {
      appEnv: process.env.TEST_APP_ENV ?? null,
      featureFlag: process.env.TEST_FEATURE_FLAG ?? null,
      auth: identity
        ? {
            subject: identity.subject,
            name: identity.name,
            email: identity.email,
          }
        : null,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const items = await ctx.db
      .query("crudItems")
      .withIndex("by_owner_updated_at", (q) => q.eq("ownerSubject", identity.subject))
      .order("desc")
      .collect();
    return await Promise.all(
      items.map(async (item) => {
        const files = await ctx.db
          .query("crudFiles")
          .withIndex("by_item", (q) => q.eq("itemId", item._id))
          .collect();
        return {
          ...item,
          files: await Promise.all(
            files.map(async (file) => ({
              ...file,
              url: await ctx.storage.getUrl(file.storageId),
            })),
          ),
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx);
    return await ctx.db.insert("crudItems", {
      title: args.title,
      body: args.body,
      status: "todo",
      ownerSubject: actor.subject,
      ownerName: actor.name,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("crudItems"),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Record not found");
    }
    assertOwner(item, actor.subject);
    await ctx.db.patch(args.id, {
      title: args.title,
      body: args.body,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("crudItems"),
  },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) {
      return;
    }
    assertOwner(item, actor.subject);
    const files = await ctx.db
      .query("crudFiles")
      .withIndex("by_item", (q) => q.eq("itemId", args.id))
      .collect();
    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }
    await ctx.db.delete(args.id);
  },
});
