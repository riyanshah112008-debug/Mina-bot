// ==========================================
// 🌐 STARRY GLOBAL TUNNEL & PUBLIC DOMAIN MANAGER
// File Path: src/utils/tunnelManager.js
// Provides 24/7 Global Public HTTPS Access for Dashboard & Verification
// ==========================================
const localtunnel = require('localtunnel');

let activeTunnel = null;
let publicDomainUrl = 'https://starry-bot.loca.lt';
let isConnecting = false;
let reconnectTimer = null;

async function startTunnel(port = 10000) {
    if (isConnecting) return publicDomainUrl;
    isConnecting = true;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    try {
        if (activeTunnel) {
            try { activeTunnel.close(); } catch (e) {}
            activeTunnel = null;
        }

        activeTunnel = await localtunnel({ 
            port: port,
            subdomain: 'starry-bot'
        });

        publicDomainUrl = activeTunnel.url;
        global.PUBLIC_WEB_URL = publicDomainUrl;
        process.env.PUBLIC_WEB_URL = publicDomainUrl;
        isConnecting = false;

        console.log(`🌐 [Starry Public Domain] Live Public HTTPS URL: ${publicDomainUrl}`);

        activeTunnel.on('close', () => {
            scheduleReconnect(port, 10000);
        });

        activeTunnel.on('error', (err) => {
            scheduleReconnect(port, 15000);
        });

        return publicDomainUrl;
    } catch (e) {
        // Fallback to random subdomain if custom subdomain is busy
        try {
            activeTunnel = await localtunnel({ port: port });
            publicDomainUrl = activeTunnel.url;
            global.PUBLIC_WEB_URL = publicDomainUrl;
            process.env.PUBLIC_WEB_URL = publicDomainUrl;
            isConnecting = false;
            console.log(`🌐 [Starry Public Domain Fallback]: ${publicDomainUrl}`);

            activeTunnel.on('close', () => scheduleReconnect(port, 10000));
            activeTunnel.on('error', () => scheduleReconnect(port, 15000));

            return publicDomainUrl;
        } catch (err2) {
            isConnecting = false;
            scheduleReconnect(port, 20000);
            return 'https://starry-bot.loca.lt';
        }
    }
}

function scheduleReconnect(port, delayMs) {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startTunnel(port);
    }, delayMs);
}

function getPublicUrl() {
    // 1. Explicit verification URL or proxy override (e.g. Cloudflare Worker or unblocked public domain)
    if (process.env.VERIFY_URL && process.env.VERIFY_URL.trim() !== '') {
        return process.env.VERIFY_URL.trim().replace(/\/$/, '');
    }
    if (process.env.PUBLIC_VERIFY_URL && process.env.PUBLIC_VERIFY_URL.trim() !== '') {
        return process.env.PUBLIC_VERIFY_URL.trim().replace(/\/$/, '');
    }
    if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim() !== '') {
        return process.env.PUBLIC_URL.trim().replace(/\/$/, '');
    }
    if (process.env.CUSTOM_DOMAIN && process.env.CUSTOM_DOMAIN.trim() !== '') {
        return process.env.CUSTOM_DOMAIN.trim().replace(/\/$/, '');
    }
    if (process.env.GG_DOMAIN && process.env.GG_DOMAIN.trim() !== '') {
        return process.env.GG_DOMAIN.trim().replace(/\/$/, '');
    }
    // 2. Active Tunnel URL (if running and publicly accessible)
    if (global.PUBLIC_WEB_URL && typeof global.PUBLIC_WEB_URL === 'string' && !global.PUBLIC_WEB_URL.includes('localhost') && !global.PUBLIC_WEB_URL.includes('127.0.0.1')) {
        return global.PUBLIC_WEB_URL.trim().replace(/\/$/, '');
    }
    if (process.env.PUBLIC_WEB_URL && typeof process.env.PUBLIC_WEB_URL === 'string' && !process.env.PUBLIC_WEB_URL.includes('localhost') && !process.env.PUBLIC_WEB_URL.includes('127.0.0.1')) {
        return process.env.PUBLIC_WEB_URL.trim().replace(/\/$/, '');
    }
    // 3. Render cloud hosting URL
    if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim() !== '') {
        return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/$/, '');
    }
    if (process.env.RENDER_EXTERNAL_HOSTNAME && process.env.RENDER_EXTERNAL_HOSTNAME.trim() !== '') {
        return `https://${process.env.RENDER_EXTERNAL_HOSTNAME.trim().replace(/\/$/, '')}`;
    }
    return publicDomainUrl || 'https://manager-bot-1-6167.onrender.com';
}

module.exports = {
    startTunnel,
    getPublicUrl
};
