import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

async function requireOwnedItem(ctx: any, itemId: any, subject: string) {
  const item = await ctx.db.get(itemId);
  if (!item) {
    throw new Error("Record not found");
  }
  if (item.ownerSubject !== subject) {
    throw new Error("Not authorized for this record");
  }
  return item;
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attach = mutation({
  args: {
    itemId: v.id("crudItems"),
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    await requireOwnedItem(ctx, args.itemId, identity.subject);
    return await ctx.db.insert("crudFiles", {
      ...args,
      uploadedBySubject: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("crudFiles"),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const file = await ctx.db.get(args.id);
    if (!file) {
      return;
    }
    await requireOwnedItem(ctx, file.itemId, identity.subject);
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.id);
  },
});

export const getUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const file = await ctx.db
      .query("crudFiles")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (!file) {
      return null;
    }
    await requireOwnedItem(ctx, file.itemId, identity.subject);
    return await ctx.storage.getUrl(args.storageId);
  },
});
