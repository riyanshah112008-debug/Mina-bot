// ==========================================
// 🛡️ STARRY 24/7 SUPREME MASTER PROCESS SUPERVISOR
// Features: Auto-Respawn, Deadlock Recovery, Health-Check Watchdog, Termux Wake-Lock
// ==========================================

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');

const BOT_SCRIPT = path.join(__dirname, 'src', 'index.js');
let botProcess = null;
let consecutiveHealthFailures = 0;
let isShuttingDown = false;

function acquireWakeLock() {
    try {
        exec('termux-wake-lock', (err) => {
            if (!err) {
                // Wake lock active
            }
        });
    } catch (e) {}
}

function startBot() {
    if (isShuttingDown) return;

    acquireWakeLock();
    console.log(`[Supervisor] 🚀 Spawning Starry Bot instance at ${new Date().toISOString()}...`);

    botProcess = spawn(process.execPath, [BOT_SCRIPT], {
        cwd: __dirname,
        env: process.env,
        stdio: 'inherit'
    });

    botProcess.on('exit', (code, signal) => {
        console.warn(`[Supervisor] ⚠️ Starry Bot exited with code ${code} (signal: ${signal}).`);
        botProcess = null;
        consecutiveHealthFailures = 0;

        if (!isShuttingDown) {
            console.log('[Supervisor] 🔄 Auto-respawning Starry Bot in 1.5 seconds...');
            setTimeout(startBot, 1500);
        }
    });

    botProcess.on('error', (err) => {
        console.error('[Supervisor] ❌ Spawn Error:', err.message);
    });
}

// 🛡️ Proactive 24/7 Health-Check Watchdog
setInterval(() => {
    if (isShuttingDown || !botProcess) return;

    acquireWakeLock();

    const req = http.get('http://127.0.0.1:10000/health', { timeout: 8000 }, (res) => {
        if (res.statusCode === 200) {
            consecutiveHealthFailures = 0;
        } else {
            consecutiveHealthFailures++;
        }
    });

    req.on('error', () => {
        consecutiveHealthFailures++;
        if (consecutiveHealthFailures >= 3) {
            console.warn(`[Supervisor] ⚠️ Bot failed ${consecutiveHealthFailures} consecutive health checks. Force-restarting...`);
            consecutiveHealthFailures = 0;
            if (botProcess) {
                try {
                    botProcess.kill('SIGKILL');
                } catch (e) {}
            }
        }
    });

    req.on('timeout', () => {
        req.destroy();
        consecutiveHealthFailures++;
    });
}, 30000);

// Acquire wake lock on boot and renew every 60 seconds
acquireWakeLock();
setInterval(acquireWakeLock, 60000);

// Graceful termination handling
process.on('SIGINT', () => {
    isShuttingDown = true;
    if (botProcess) botProcess.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
    isShuttingDown = true;
    if (botProcess) botProcess.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
});

startBot();
