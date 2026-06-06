import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  componentEvents: defineTable({
    ownerSubject: v.string(),
    message: v.string(),
    mode: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner_created_at", ["ownerSubject", "createdAt"])
    .index("by_created_at", ["createdAt"]),
});
