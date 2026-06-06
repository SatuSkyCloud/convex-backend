import { defineComponent } from "convex/server";
import { v } from "convex/values";

const component = defineComponent("auditCounter", {
  env: {
    MODE: v.union(v.literal("test"), v.literal("live")),
  },
});

export default component;
