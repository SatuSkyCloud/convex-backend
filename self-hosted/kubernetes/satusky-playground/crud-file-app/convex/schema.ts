import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  crudItems: defineTable({
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    ownerSubject: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_updated_at", ["updatedAt"])
    .index("by_owner_updated_at", ["ownerSubject", "updatedAt"]),
  crudFiles: defineTable({
    itemId: v.id("crudItems"),
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    sha256: v.optional(v.string()),
    uploadedBySubject: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_item", ["itemId"])
    .index("by_storage_id", ["storageId"])
    .index("by_uploaded_by", ["uploadedBySubject", "createdAt"]),
  jobEvents: defineTable({
    kind: v.union(v.literal("cron"), v.literal("scheduled")),
    message: v.string(),
    requestedBySubject: v.optional(v.string()),
    requestedByName: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_kind", ["kind", "createdAt"]),
});
