const express = require("express");
const cors = require("cors");
const pkg = require("../package.json");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`<html><head><meta charset="utf-8"><title>Mina Bot</title><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{background:#1e293b;padding:2rem 3rem;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);text-align:center}h1{color:#38bdf8;margin-bottom:0.5rem}p{color:#94a3b8}a{color:#38bdf8;text-decoration:none;font-weight:bold}a:hover{text-decoration:underline}</style></head><body><div class="card"><h1>🌸 Mina Bot</h1><p>High-Performance Discord Moderation & Ticket Management System</p><p>Version ${pkg.version}</p><p>Status: <a href="/health">/health (Healthy)</a></p></div></body></html>`);
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    bot: "Mina Bot",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

module.exports.start = function start(portOverride) {
  return new Promise((resolve, reject) => {
    const port = portOverride || process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`[Mina Bot Web] Health listener active on port ${port}`);
      resolve(server);
    });
    server.on("error", (err) => reject(err));
  });
};
