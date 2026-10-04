/**
 * 🌐 CLOUDFLARE WORKER REVERSE PROXY FOR STARRY BOT
 * 
 * Purpose:
 * Bypasses ISP/DNS blocking of *.onrender.com (e.g. Jio, Airtel, Vi in India)
 * by proxying verification requests through Cloudflare's globally unblocked edge network.
 * 
 * Setup Instructions (Takes 60 seconds):
 * 1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create Application -> Create Worker.
 * 2. Paste this entire code into the worker editor.
 * 3. Replace UPSTREAM_RENDER_URL below with your Render service URL (e.g. https://manager-bot-1-6167.onrender.com).
 * 4. Click 'Save and Deploy'.
 * 5. Copy your worker's public URL (e.g. https://starry-verify.<your-name>.workers.dev).
 * 6. Set VERIFY_URL=<your-worker-url> in your Render Environment Variables or .env.
 */

const UPSTREAM_RENDER_URL = 'https://manager-bot-1-6167.onrender.com';

export default {
    async fetch(request, env, ctx) {
        const clientUrl = new URL(request.url);
        
        // Rewrite hostname to Render backend
        const upstreamTarget = new URL(UPSTREAM_RENDER_URL);
        clientUrl.protocol = upstreamTarget.protocol;
        clientUrl.hostname = upstreamTarget.hostname;
        clientUrl.port = upstreamTarget.port;

        // Clone headers and preserve client IP & protocol
        const newHeaders = new Headers(request.headers);
        newHeaders.set('X-Forwarded-Host', request.headers.get('host') || clientUrl.host);
        newHeaders.set('X-Forwarded-Proto', 'https');

        const proxyRequest = new Request(clientUrl.toString(), {
            method: request.method,
            headers: newHeaders,
            body: request.body,
            redirect: 'follow'
        });

        const response = await fetch(proxyRequest);

        // Add CORS and public accessibility headers
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', '*');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
    }
};
