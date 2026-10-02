const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

class StreamResolverClient {
    constructor() {
        this.process = null;
        this.ready = false;
        this.reqId = 0;
        this.pending = new Map();
        this.cache = new Map();
        this.init();
    }

    init() {
        if (this.process) {
            try { this.process.kill(); } catch (e) {}
        }
        const scriptPath = path.join(__dirname, 'streamResolver.py');
        this.process = spawn('python3', [scriptPath], {
            stdio: ['pipe', 'pipe', 'inherit']
        });

        const rl = readline.createInterface({ input: this.process.stdout });

        rl.on('line', (line) => {
            line = line.trim();
            if (line === 'READY') {
                this.ready = true;
                this.consecutiveFailures = 0;
                console.log('⚡ [Stream Resolver Engine] Python daemon ready for original studio audio resolution.');
                return;
            }
            if (line === 'UNAVAILABLE') {
                this.ready = false;
                this.disabled = true;
                console.log('⚡ [Stream Resolver Engine] Cloud host detected: yt-dlp unavailable. Using native Lavalink cluster.');
                return;
            }
            try {
                const data = JSON.parse(line);
                if (data.id && this.pending.has(data.id)) {
                    const { resolve, timer } = this.pending.get(data.id);
                    clearTimeout(timer);
                    this.pending.delete(data.id);
                    resolve(data);
                }
            } catch (e) {}
        });

        this.process.on('close', (code) => {
            this.ready = false;
            if (this.disabled || code === 0) return; // Clean voluntary exit or disabled

            this.consecutiveFailures = (this.consecutiveFailures || 0) + 1;
            if (this.consecutiveFailures >= 3) {
                this.disabled = true;
                console.warn('⚠️ [Stream Resolver Engine] Python worker failed 3 times. Falling back to native Lavalink audio.');
                return;
            }
            console.warn(`⚠️ [Stream Resolver Engine] Worker exited (${code}). Retrying in 5s...`);
            setTimeout(() => this.init(), 5000);
        });

        this.process.on('error', (err) => {
            this.disabled = true;
            console.warn('⚠️ [Stream Resolver Engine] Process error (native Lavalink will be used):', err.message);
        });
    }

    async resolve(query) {
        if (!query) return null;
        const cacheKey = query.trim().toLowerCase();
        const cached = this.cache.get(cacheKey);
        if (cached && cached.file && fs.existsSync(cached.file) && (Date.now() - cached.timestamp < 86400000)) {
            return cached;
        }

        const id = ++this.reqId;
        const payload = JSON.stringify({ id, query }) + '\n';

        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    resolve(null);
                }
            }, 18000);

            this.pending.set(id, { resolve, timer });

            try {
                if (this.process && this.process.stdin.writable) {
                    this.process.stdin.write(payload);
                } else {
                    clearTimeout(timer);
                    this.pending.delete(id);
                    resolve(null);
                }
            } catch (e) {
                clearTimeout(timer);
                this.pending.delete(id);
                resolve(null);
            }
        }).then((res) => {
            if (res && res.status === 'ok' && res.file && fs.existsSync(res.file)) {
                const item = { file: res.file, title: res.title, duration: res.duration, timestamp: Date.now() };
                this.cache.set(cacheKey, item);
                return item;
            }
            return null;
        });
    }

    async resolvePlaylist(url) {
        if (!url) return null;
        const cacheKey = 'pl:' + url.trim().toLowerCase();
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 600000)) {
            return cached.data;
        }

        const id = ++this.reqId;
        const payload = JSON.stringify({ id, action: 'resolve_playlist', url }) + '\n';

        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    resolve(null);
                }
            }, 30000);

            this.pending.set(id, { resolve, timer });

            try {
                if (this.process && this.process.stdin.writable) {
                    this.process.stdin.write(payload);
                } else {
                    clearTimeout(timer);
                    this.pending.delete(id);
                    resolve(null);
                }
            } catch (e) {
                clearTimeout(timer);
                this.pending.delete(id);
                resolve(null);
            }
        }).then((res) => {
            if (res && res.status === 'ok' && res.tracks && res.tracks.length > 0) {
                this.cache.set(cacheKey, { data: res, timestamp: Date.now() });
                return res;
            }
            return null;
        });
    }
}

const streamResolver = new StreamResolverClient();
module.exports = streamResolver;
