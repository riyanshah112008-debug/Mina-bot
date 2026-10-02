const { ensureSingleInstance } = require("./singleInstance");
const client = require("./client");
const config = require("./config");
const { loadCommands } = require("./handlers/commandLoader");
const { loadEvents } = require("./handlers/eventLoader");
const { initializeDatabase } = require("./utils/database");

// Validate configuration
if (!config.validate()) {
  process.exit(1);
}

ensureSingleInstance();

// Process-level safety handlers
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason instanceof Error ? reason.stack || reason.message : reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err && (err.stack || err.message) ? err.stack || err.message : err);
});

process.on("SIGINT", async () => {
  console.info("[Friendbase] SIGINT received, shutting down cleanly...");
  try {
    if (client && typeof client.destroy === "function") await client.destroy();
  } catch (e) {}
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.info("[Friendbase] SIGTERM received, shutting down cleanly...");
  try {
    if (client && typeof client.destroy === "function") await client.destroy();
  } catch (e) {}
  process.exit(0);
});

// Initialize storage and loaders
initializeDatabase();
loadCommands();
loadEvents(client);

// Connect to Discord
client.login(config.token).catch((err) => {
  console.error("[Mina Bot Login Failed]:", err.message);
  if (config.token && typeof config.token === "string") {
    const masked = `${config.token.slice(0, 6)}...${config.token.slice(-4)} (length: ${config.token.length})`;
    console.error(`[Mina Bot Auth Diagnostics] Token format: ${masked}`);
  } else {
    console.error("[Mina Bot Auth Diagnostics] No Discord token was provided in environment variables!");
  }
  process.exit(1);
});

