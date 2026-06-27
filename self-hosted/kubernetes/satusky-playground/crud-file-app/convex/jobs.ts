import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("jobEvents").order("desc").take(20);
  },
});

export const scheduleDelayedEvent = mutation({
  args: {
    delayMs: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ scheduledFor: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    const delayMs = Math.max(0, Math.min(args.delayMs ?? 5000, 60_000));
    const scheduledFor = Date.now() + delayMs;
    await ctx.scheduler.runAfter(delayMs, internal.jobs.scheduledHeartbeat, {
      message: args.message ?? "Manual scheduled job fired",
      requestedBySubject: identity?.subject,
      requestedByName: identity?.name ?? identity?.email,
      scheduledFor,
    });
    return { scheduledFor };
  },
});

export const scheduledHeartbeat = internalMutation({
  args: {
    message: v.string(),
    requestedBySubject: v.optional(v.string()),
    requestedByName: v.optional(v.string()),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("jobEvents", {
      kind: "scheduled",
      message: args.message,
      requestedBySubject: args.requestedBySubject,
      requestedByName: args.requestedByName,
      scheduledFor: args.scheduledFor,
      createdAt: Date.now(),
    });
  },
});

export const cronHeartbeat = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.db.insert("jobEvents", {
      kind: "cron",
      message: "Cron heartbeat fired",
      createdAt: Date.now(),
    });
  },
});
