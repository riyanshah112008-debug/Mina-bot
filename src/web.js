const express = require("express");
const cors = require("cors");
const pkg = require("../package.json");
const client = require("./client");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  const isOnline = Boolean(client && typeof client.isReady === "function" && client.isReady());
  const botTag = isOnline && client.user ? client.user.tag : "Mina Bot";
  const statusColor = isOnline ? "#22c55e" : "#f59e0b";
  const statusText = isOnline ? "Online & Connected" : "Connecting...";

  res.send(`<html><head><meta charset="utf-8"><title>Mina Bot</title><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{background:#1e293b;padding:2rem 3rem;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);text-align:center}h1{color:#38bdf8;margin-bottom:0.5rem}p{color:#94a3b8}.badge{display:inline-block;padding:0.25rem 0.75rem;border-radius:9999px;font-weight:bold;background:${statusColor};color:#0f172a;margin:0.5rem 0}a{color:#38bdf8;text-decoration:none;font-weight:bold}a:hover{text-decoration:underline}</style></head><body><div class="card"><h1>🌸 Mina Bot</h1><p>High-Performance Discord Moderation & Ticket Management System</p><p>Version ${pkg.version}</p><div><span class="badge">${statusText}</span></div><p>Discord User: <b>${botTag}</b></p><p>Status API: <a href="/health">/health</a></p></div></body></html>`);
});

app.get("/health", (req, res) => {
  const isReady = Boolean(client && typeof client.isReady === "function" && client.isReady());
  res.json({
    status: "ok",
    bot: "Mina Bot",
    version: pkg.version,
    discord: {
      connected: isReady,
      status: isReady ? "ONLINE" : (client && client.ws && client.ws.status === 0 ? "READY" : "CONNECTING"),
      tag: isReady && client.user ? client.user.tag : null,
      id: isReady && client.user ? client.user.id : null,
      guilds: isReady && client.guilds && client.guilds.cache ? client.guilds.cache.size : 0,
      ping: isReady && client.ws ? `${client.ws.ping}ms` : null,
    },
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

let keepAliveInterval = null;

function setupKeepAlive() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || "https://friendbase-1.onrender.com";
  if (!targetUrl) return;

  const pingUrl = targetUrl.endsWith("/health") ? targetUrl : `${targetUrl.replace(/\/$/, "")}/health`;
  const intervalMs = 8 * 60 * 1000; // 8 minutes (Render free tier sleeps after 15 min idle)

  if (keepAliveInterval) clearInterval(keepAliveInterval);

  keepAliveInterval = setInterval(() => {
    try {
      const https = require("https");
      const http = require("http");
      const clientLib = pingUrl.startsWith("https") ? https : http;
      clientLib.get(pingUrl, (resp) => {
        console.log(`[KeepAlive] 🟢 Self-ping success (${resp.statusCode}) - keeping Render service awake`);
      }).on("error", (err) => {
        console.warn(`[KeepAlive] ⚠️ Self-ping warn:`, err.message);
      });
    } catch (e) {
      console.warn(`[KeepAlive] Self-ping exception:`, e.message);
    }
  }, intervalMs);

  if (keepAliveInterval && typeof keepAliveInterval.unref === "function") {
    keepAliveInterval.unref();
  }

  console.log(`[KeepAlive] ⏱️ Self-ping scheduled every 8m to ${pingUrl} (prevents Render idle sleep).`);
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

module.exports.start = function start(portOverride) {
  return new Promise((resolve, reject) => {
    const port = portOverride || process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`[Mina Bot Web] Health listener active on port ${port}`);
      setupKeepAlive();
      resolve(server);
    });
    server.on("error", (err) => reject(err));
  });
};

module.exports.stopKeepAlive = stopKeepAlive;

