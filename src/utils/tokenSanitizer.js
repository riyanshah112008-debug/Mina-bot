// ==========================================
// 🛡️ STARRY TOKEN SANITIZER & PRE-FLIGHT VERIFIER
// File Path: src/utils/tokenSanitizer.js
// Ultra-resilient token extraction with mobile space filtering
// ==========================================

/**
 * Robustly sanitizes Discord bot tokens, removing common copy-paste artifacts
 * such as variable names, straight/smart quotes, zero-width spaces, mobile punctuation spaces,
 * and escaped newline characters.
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
    
    // 2. Strip Unicode zero-width characters, non-breaking spaces, and variation selectors
    tok = tok.replace(/[\u200B-\u200D\uFEFF\u00A0\uFE0E\uFE0F]/g, '');
    
    // 3. Strip escaped newlines/tabs (literal \r, \n, \t from environment variables)
    tok = tok.replace(/\\r|\\n|\\t/g, '');
    tok = tok.replace(/[\r\n\t]/g, '').trim();
    
    // 4. Strip straight quotes, escaped quotes (\", \'), backticks, and mobile smart quotes (“ ” ‘ ’)
    tok = tok.replace(/\\"/g, '"').replace(/\\'/g, "'");
    tok = tok.replace(/^["'`\u201C\u201D\u2018\u2019]+|["'`\u201C\u201D\u2018\u2019]+$/g, '').trim();
    
    // 5. Strip "Bot " prefix if user added it manually
    tok = tok.replace(/^Bot\s+/i, '').trim();
    
    // 6. CRUCIAL FIX FOR MOBILE KEYBOARDS:
    // Discord tokens are Base64/HMAC strings that NEVER contain spaces.
    // When pasting on mobile keyboards (such as Android Gboard or iOS), spaces are automatically
    // inserted after punctuation characters like '.' (turning a 72-char token into 74 chars).
    // Stripping all whitespace guarantees that mobile copy-pasted tokens are always restored to valid form.
    tok = tok.replace(/\s+/g, '');
    
    // 7. Regex token extractor: If surrounded by other characters or JSON wrapper, extract the 3-part Discord token
    const tokenRegex = /([A-Za-z0-9_-]{24,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,45})/;
    const match = tok.match(tokenRegex);
    if (match) {
        return match[1];
    }
    
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
 * @returns {Promise<{valid: boolean, bot?: object, status?: number, error?: string, networkError?: string}>}
 */
async function verifyDiscordToken(token) {
    if (!token) return { valid: false, error: 'Token is empty' };
    const cleaned = cleanToken(token);
    try {
        const res = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bot ${cleaned}` }
        });
        if (res.ok) {
            const botData = await res.json();
            return { valid: true, bot: botData, status: res.status, cleanedToken: cleaned };
        } else {
            const errorText = await res.text();
            return { valid: false, status: res.status, error: errorText, cleanedToken: cleaned };
        }
    } catch (netErr) {
        return { valid: false, networkError: netErr.message, cleanedToken: cleaned };
    }
}

/**
 * Robustly sanitizes MongoDB connection strings, removing variable prefixes,
 * straight and smart quotes, zero-width spaces, escaped characters, and whitespace.
 * @param {string} raw - The raw URI string
 * @returns {string} - The cleaned MongoDB URI
 */
function cleanMongoUri(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let uri = raw.trim();

    // 1. Remove prefixes like "MONGO_URI=" or "MONGODB_URI="
    if (uri.includes('=')) {
        const parts = uri.split('=');
        if (parts[0].includes('MONGO') || parts[0].includes('DATABASE') || parts[0].includes('URI') || parts[0].includes('URL')) {
            uri = parts.slice(1).join('=').trim();
        }
    }

    // 2. Strip Unicode zero-width characters, non-breaking spaces, and variation selectors
    uri = uri.replace(/[\u200B-\u200D\uFEFF\u00A0\uFE0E\uFE0F]/g, '');

    // 3. Strip escaped newlines, tabs, carriage returns
    uri = uri.replace(/\\r|\\n|\\t/g, '');
    uri = uri.replace(/[\r\n\t]/g, '').trim();

    // 4. Strip straight quotes, escaped quotes, and smart quotes
    uri = uri.replace(/\\"/g, '"').replace(/\\'/g, "'");
    uri = uri.replace(/^["'`\u201C\u201D\u2018\u2019]+|["'`\u201C\u201D\u2018\u2019]+$/g, '').trim();

    // 5. Strip all internal whitespace
    uri = uri.replace(/\s+/g, '');

    return uri;
}

/**
 * Returns a masked preview of the MongoDB URI for secure logging.
 * Replaces credentials with asterisks.
 */
function maskMongoUri(uri) {
    if (!uri || typeof uri !== 'string') return '(empty)';
    try {
        return uri.replace(/:([^:@]+)@/, ':****@');
    } catch (_) {
        return 'mongodb+srv://****@cluster...';
    }
}

module.exports = {
    cleanToken,
    maskToken,
    verifyDiscordToken,
    cleanMongoUri,
    maskMongoUri
};
