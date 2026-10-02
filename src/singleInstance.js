const fs = require("fs");
const path = require("path");

function ensureSingleInstance() {
  const lockFile = path.join(process.cwd(), ".mina.lock");

  try {
    if (fs.existsSync(lockFile)) {
      const existingPid = Number(fs.readFileSync(lockFile, "utf8").trim());
      const pidIsAlive = existingPid && (() => {
        try {
          process.kill(existingPid, 0);
          return true;
        } catch (error) {
          return false;
        }
      })();

      if (pidIsAlive) {
        console.error("[Mina Bot] Another bot instance is already running. Only one instance is allowed.");
        process.exit(1);
      }

      fs.unlinkSync(lockFile);
    }

    const fd = fs.openSync(lockFile, "wx");
    fs.writeFileSync(fd, String(process.pid));
    fs.closeSync(fd);

    const cleanup = () => {
      try {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
        }
      } catch (error) {
        // ignore cleanup errors
      }
    };

    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  } catch (error) {
    console.error("[Mina Bot] Another bot instance is already running. Only one instance is allowed.");
    process.exit(1);
  }
}

module.exports = { ensureSingleInstance };
