// ==========================================
// 🛡️ STARRY TOKEN SANITIZER & PRE-FLIGHT VERIFIER
// File Path: src/utils/tokenSanitizer.js
// ==========================================

/**
 * Robustly sanitizes Discord bot tokens, removing common copy-paste artifacts
 * such as variable names, straight/smart quotes, zero-width spaces, and whitespace.
 * @param {string} raw - The raw token string from process.env
 * @returns {string} - The cleaned token
 */
function cleanToken(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let tok = raw.trim();
    
    // 1. If pasted with key prefix like "DISCORD_TOKEN=xyz" or "TOKEN = xyz"
    if (tok.includes('=')) {
        const parts = tok.split('=');
        tok = parts.slice(1).join('=').trim();
    }
    
    // 2. Strip Unicode zero-width characters and non-breaking spaces
    tok = tok.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
    
    // 3. Strip newlines, tabs, carriage returns
    tok = tok.replace(/[\r\n\t]/g, '').trim();
    
    // 4. Strip straight quotes, backticks, and mobile smart quotes (“ ” ‘ ’)
    tok = tok.replace(/^["'`\u201C\u201D\u2018\u2019]+|["'`\u201C\u201D\u2018\u2019]+$/g, '').trim();
    
    // 5. Strip "Bot " prefix if user added it manually
    tok = tok.replace(/^Bot\s+/i, '').trim();
    
    return tok;
}

/**
 * Returns a masked preview of the token for secure logging.
 * Example: MTUxMz...KjqEY (72 chars)
 */
function maskToken(token) {
    if (!token || typeof token !== 'string') return '(empty)';
    if (token.length < 15) return `(invalid length: ${token.length})`;
    return `${token.slice(0, 6)}...${token.slice(-5)} (${token.length} chars)`;
}

/**
 * Validates a Discord bot token directly against Discord REST API (/users/@me).
 * This runs before WebSocket login so exact HTTP status codes and reasons are logged.
 * @param {string} token
 * @returns {Promise<{valid: boolean, bot?: object, status?: number, error?: string}>}
 */
async function verifyDiscordToken(token) {
    if (!token) return { valid: false, error: 'Token is empty' };
    try {
        const res = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bot ${token}` }
        });
        if (res.ok) {
            const botData = await res.json();
            return { valid: true, bot: botData, status: res.status };
        } else {
            const errorText = await res.text();
            return { valid: false, status: res.status, error: errorText };
        }
    } catch (netErr) {
        return { valid: false, networkError: netErr.message };
    }
}

module.exports = {
    cleanToken,
    maskToken,
    verifyDiscordToken
};
