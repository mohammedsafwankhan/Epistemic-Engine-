import { createApp } from "./app.js";
import { config } from "./config/env.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[Epistemic Engine API] Running in ${config.nodeEnv} mode on http://localhost:${config.port}`);
  console.log(`[Epistemic Engine API] Health check at http://localhost:${config.port}/health`);
});

process.on("SIGTERM", () => {
  console.log("[Epistemic Engine API] SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("[Epistemic Engine API] Process terminated.");
  });
});

