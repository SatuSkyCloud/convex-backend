import { defineApp } from "convex/server";
import auditCounter from "./components/auditCounter/convex.config.js";

const app = defineApp();

app.use(auditCounter, {
  name: "auditA",
  env: {
    MODE: "test",
  },
});

app.use(auditCounter, {
  name: "auditB",
  env: {
    MODE: "live",
  },
});

export default app;
