import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  files: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    sha256: v.string(),
  }),
});
