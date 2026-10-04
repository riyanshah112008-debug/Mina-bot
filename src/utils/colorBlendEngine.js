// ==========================================
// 🎨 STARRY COLOR BLEND & OPTICAL ENGINE
// File Path: src/utils/colorBlendEngine.js
// Advanced Color Space Math, Gamma-Corrected Blending, Presets & WCAG Analytics
// Zero-Boost Discord Name Color Integration
// ==========================================

// Extended Named Color Dictionary for intuitive color inputs
const NAMED_COLORS = {
    // Discord brand
    blurple: '#5865F2',
    fuchsia: '#EB459E',
    green: '#57F287',
    yellow: '#FEE75C',
    red: '#ED4245',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#95A5A6',
    gray: '#95A5A6',
    dark: '#2B2D31',

    // Primary & Secondary
    blue: '#0070F3',
    cyan: '#00E5FF',
    aqua: '#00FFFF',
    teal: '#009688',
    lime: '#76FF03',
    orange: '#FF9800',
    purple: '#9C27B0',
    violet: '#7B1FA2',
    magenta: '#FF00FF',
    pink: '#FF4081',
    crimson: '#DC143C',
    gold: '#FFD700',
    coral: '#FF7F50',
    salmon: '#FA8072',
    mint: '#00F5D4',
    rose: '#FF007F',
    indigo: '#4B0082',
    navy: '#000080',
    sky: '#00B4D8',
    amber: '#FFC107',
    emerald: '#2ECC71',
    ruby: '#E0115F',
    sapphire: '#0F52BA',
    amethyst: '#9966CC'
};

// 26 Curated Master Presets across 6 aesthetic dimensions
const PRESETS = {
    // 🌅 Sunset & Warmth
    sunset: {
        id: 'sunset',
        name: 'Sunset Horizon',
        emoji: '🌅',
        category: 'Warm',
        hex1: '#FF512F',
        hex2: '#DD2476',
        description: 'Vivid twilight transition from golden blood orange to radiant magenta.'
    },
    fire: {
        id: 'fire',
        name: 'Phoenix Blaze',
        emoji: '🔥',
        category: 'Warm',
        hex1: '#F12711',
        hex2: '#F5AF19',
        description: 'Intense kinetic magma blending into blazing amber solar flare.'
    },
    peach: {
        id: 'peach',
        name: 'Velvet Peach',
        emoji: '🍑',
        category: 'Warm',
        hex1: '#ED4264',
        hex2: '#FFEDBC',
        description: 'Soft summer nectarine fading smoothly into sweet vanilla cream.'
    },
    bloodmoon: {
        id: 'bloodmoon',
        name: 'Crimson Eclipse',
        emoji: '🩸',
        category: 'Warm',
        hex1: '#870000',
        hex2: '#FF2A2A',
        description: 'Deep nocturnal gothic crimson glowing into incandescent scarlet.'
    },

    // 🌌 Cyber & Synthwave
    cyberpunk: {
        id: 'cyberpunk',
        name: 'Cyberpunk 2099',
        emoji: '⚡',
        category: 'Cyber',
        hex1: '#FF007F',
        hex2: '#7928CA',
        description: 'Electric neon hot-pink fused with deep dystopian hyper-violet.'
    },
    vaporwave: {
        id: 'vaporwave',
        name: 'Vaporwave Dream',
        emoji: '🌴',
        category: 'Cyber',
        hex1: '#FF71CE',
        hex2: '#01CDFE',
        description: 'Retro 80s aesthetic blend of synth pastel pink and cyan laser.'
    },
    neon: {
        id: 'neon',
        name: 'Neon Velocity',
        emoji: '🚦',
        category: 'Cyber',
        hex1: '#00F5D4',
        hex2: '#7B2CBF',
        description: 'Hypnotic high-contrast glow between mint turquoise and ultra-violet.'
    },
    electric: {
        id: 'electric',
        name: 'Electric Sparks',
        emoji: '🔌',
        category: 'Cyber',
        hex1: '#F9D423',
        hex2: '#FF4E50',
        description: 'High-voltage lightning pulse from laser yellow to volcanic red.'
    },

    // 🌊 Ocean & Atmosphere
    ocean: {
        id: 'ocean',
        name: 'Oceanic Depths',
        emoji: '🌊',
        category: 'Cool',
        hex1: '#00F2FE',
        hex2: '#4FACFE',
        description: 'Glacial tropical reef water cascading into sapphire abyssal deeps.'
    },
    arctic: {
        id: 'arctic',
        name: 'Arctic Blizzard',
        emoji: '❄️',
        category: 'Cool',
        hex1: '#70A6FF',
        hex2: '#91EAE4',
        description: 'Crisp permafrost blue blending into crystal-clear ice shimmer.'
    },
    aurora: {
        id: 'aurora',
        name: 'Northern Aurora',
        emoji: '🌌',
        category: 'Cool',
        hex1: '#00F260',
        hex2: '#0575E6',
        description: 'Luminescent arctic geomagnetic curtain of emerald and royal blue.'
    },
    deepsea: {
        id: 'deepsea',
        name: 'Abyssal Trench',
        emoji: '🐋',
        category: 'Cool',
        hex1: '#0D1B2A',
        hex2: '#00B4D8',
        description: 'Midnight oceanic trench fading upward into illuminated azure.'
    },

    // 🌸 Pastel & Soft Aura
    sakura: {
        id: 'sakura',
        name: 'Cherry Blossom',
        emoji: '🌸',
        category: 'Pastel',
        hex1: '#FFA8A8',
        hex2: '#FC6C85',
        description: 'Delicate petals floating on spring breeze from soft rose to coral.'
    },
    cotton_candy: {
        id: 'cotton_candy',
        name: 'Cotton Candy',
        emoji: '🍬',
        category: 'Pastel',
        hex1: '#FFAFBD',
        hex2: '#C9FFBF',
        description: 'Whimsical carnival fluff blending strawberry marshmallow with honeydew.'
    },
    bubblegum: {
        id: 'bubblegum',
        name: 'Bubblegum Pop',
        emoji: '🫧',
        category: 'Pastel',
        hex1: '#FF6584',
        hex2: '#FF8C94',
        description: 'Vibrant candy pink with playful salmon undertones.'
    },
    lavender: {
        id: 'lavender',
        name: 'Lavender Mist',
        emoji: '🪻',
        category: 'Pastel',
        hex1: '#C471ED',
        hex2: '#F64F59',
        description: 'Soothing floral dusk transitioning from lilac violet to sunset blush.'
    },

    // 🍃 Nature & Matrix
    emerald: {
        id: 'emerald',
        name: 'Mystic Emerald',
        emoji: '💎',
        category: 'Nature',
        hex1: '#11998E',
        hex2: '#38EF7D',
        description: 'Ancient jade rainforest foliage infused with radiant neon vitality.'
    },
    matrix: {
        id: 'matrix',
        name: 'Terminal Matrix',
        emoji: '💻',
        category: 'Nature',
        hex1: '#00FF41',
        hex2: '#008F11',
        description: 'Raw cyberpunk green phosphor glowing through dark monochrome cyberspace.'
    },
    toxic: {
        id: 'toxic',
        name: 'Toxic Slime',
        emoji: '🧪',
        category: 'Nature',
        hex1: '#76B852',
        hex2: '#8DC26F',
        description: 'Bioluminescent radioactive chemical sheen with vibrant lime aura.'
    },
    forest: {
        id: 'forest',
        name: 'Whispering Pines',
        emoji: '🌲',
        category: 'Nature',
        hex1: '#134E5E',
        hex2: '#71B280',
        description: 'Deep woodland moss canopy meeting illuminated alpine sunlight.'
    },

    // 🔮 Cosmic & Royalty
    galaxy: {
        id: 'galaxy',
        name: 'Supernova Galaxy',
        emoji: '✨',
        category: 'Cosmic',
        hex1: '#3A1C71',
        hex2: '#D76D77',
        description: 'Interstellar nebula dust from dark purple core to starlit champagne.'
    },
    amethyst: {
        id: 'amethyst',
        name: 'Royal Amethyst',
        emoji: '🔮',
        category: 'Cosmic',
        hex1: '#9B51E0',
        hex2: '#3498DB',
        description: 'Imperial gemstone shimmer merging majestic purple and celestial cobalt.'
    },
    gold: {
        id: 'gold',
        name: 'Starlight Luxury',
        emoji: '👑',
        category: 'Cosmic',
        hex1: '#F7971E',
        hex2: '#FFD200',
        description: 'High-purity 24-karat liquid gold reflecting dazzling solar rays.'
    },
    obsidian: {
        id: 'obsidian',
        name: 'Volcanic Obsidian',
        emoji: '🖤',
        category: 'Cosmic',
        hex1: '#232526',
        hex2: '#414345',
        description: 'Sleek dark mirrored obsidian stone with metallic tungsten reflections.'
    },
    holographic: {
        id: 'holographic',
        name: 'Holographic Prism',
        emoji: '💿',
        category: 'Cosmic',
        hex1: '#A9FFFF',
        hex2: '#FFCCCC',
        hex3: '#FFE0A0',
        description: 'Discord official holographic spectrum: iridescent ice cyan, prismatic pearl, and gold accent.'
    }
};

class ColorBlendEngine {
    constructor() {
        this.PRESETS = PRESETS;
        this.NAMED_COLORS = NAMED_COLORS;
    }

    /**
     * Clean and normalize any hex code, named color, or numeric input
     * @param {string|number} input 
     * @returns {string|null} Normalized uppercase 6-digit hex code with '#' (e.g. '#FF0055')
     */
    parseHex(input) {
        if (!input) return null;
        let str = String(input).trim().toLowerCase();

        // Check if matching a named color
        if (NAMED_COLORS[str]) {
            return NAMED_COLORS[str].toUpperCase();
        }

        // Strip leading prefixes: #, 0x, #0x
        str = str.replace(/^(0x|#)/i, '').trim();

        // 3-digit hex expansion: #F05 -> #FF0055
        if (/^[0-9a-f]{3}$/i.test(str)) {
            const r = str[0] + str[0];
            const g = str[1] + str[1];
            const b = str[2] + str[2];
            return `#${r}${g}${b}`.toUpperCase();
        }

        // 6-digit hex validation
        if (/^[0-9a-f]{6}$/i.test(str)) {
            return `#${str}`.toUpperCase();
        }

        return null;
    }

    /**
     * Convert Hex string to RGB components
     * @param {string} hex 
     * @returns {{r: number, g: number, b: number}}
     */
    hexToRgb(hex) {
        const clean = this.parseHex(hex);
        if (!clean) return { r: 255, g: 255, b: 255 };
        const num = parseInt(clean.slice(1), 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    /**
     * Convert RGB components to 6-digit uppercase Hex string
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @returns {string}
     */
    rgbToHex(r, g, b) {
        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
        const hex = ((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, '0');
        return `#${hex.toUpperCase()}`;
    }

    /**
     * Convert Hex string to 24-bit integer (for Discord API)
     * @param {string} hex 
     * @returns {number}
     */
    hexToInt(hex) {
        const clean = this.parseHex(hex);
        if (!clean) return 0;
        return parseInt(clean.slice(1), 16);
    }

    /**
     * Convert 24-bit integer to Hex string
     * @param {number} num 
     * @returns {string}
     */
    intToHex(num) {
        if (typeof num !== 'number') return '#FFFFFF';
        return `#${(num & 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase()}`;
    }

    /**
     * Blend two hex colors using advanced optical gamma-corrected interpolation
     * Formula: R_blend = sqrt((1 - t) * R1^2 + t * R2^2)
     * This preserves luminous photon energy and eliminates muddy/gray midpoints.
     * 
     * @param {string} hex1 First color (at t=0)
     * @param {string} hex2 Second color (at t=1)
     * @param {number} [ratio=0.5] Ratio between 0.0 and 1.0 (or percentage 0 to 100)
     * @param {'gamma'|'linear'} [method='gamma'] Blending formula
     * @returns {string} Blended uppercase Hex string
     */
    blendColors(hex1, hex2, ratio = 0.5, method = 'gamma') {
        const c1 = this.hexToRgb(hex1);
        const c2 = this.hexToRgb(hex2);

        // Normalize ratio if passed as percentage (e.g. 50 -> 0.5)
        let t = Number(ratio);
        if (isNaN(t)) t = 0.5;
        if (t > 1) t = t / 100;
        t = Math.max(0, Math.min(1, t));

        if (method === 'linear') {
            const r = (1 - t) * c1.r + t * c2.r;
            const g = (1 - t) * c1.g + t * c2.g;
            const b = (1 - t) * c1.b + t * c2.b;
            return this.rgbToHex(r, g, b);
        }

        // Photometric gamma-corrected blending (gamma ≈ 2.0 for perceptual brightness preservation)
        const r = Math.sqrt((1 - t) * (c1.r * c1.r) + t * (c2.r * c2.r));
        const g = Math.sqrt((1 - t) * (c1.g * c1.g) + t * (c2.g * c2.g));
        const b = Math.sqrt((1 - t) * (c1.b * c1.b) + t * (c2.b * c2.b));

        return this.rgbToHex(r, g, b);
    }

    /**
     * Blend an array of multiple colors evenly
     * @param {string[]} hexList 
     * @returns {string}
     */
    blendMulti(hexList) {
        if (!Array.isArray(hexList) || hexList.length === 0) return '#FFFFFF';
        if (hexList.length === 1) return this.parseHex(hexList[0]) || '#FFFFFF';

        let current = this.parseHex(hexList[0]) || '#FFFFFF';
        for (let i = 1; i < hexList.length; i++) {
            const next = this.parseHex(hexList[i]);
            if (next) {
                // Progressive weighted blend
                const weight = 1 / (i + 1);
                current = this.blendColors(current, next, weight);
            }
        }
        return current;
    }

    /**
     * Generate N gradient step swatches between two colors
     * @param {string} hex1 
     * @param {string} hex2 
     * @param {number} [steps=5] 
     * @returns {string[]}
     */
    generateSteps(hex1, hex2, steps = 5) {
        const count = Math.max(2, Math.min(20, steps));
        const results = [];
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            results.push(this.blendColors(hex1, hex2, t));
        }
        return results;
    }

    /**
     * Calculate relative luminance according to WCAG 2.1 specs
     * @param {string} hex 
     * @returns {number} 0.0 (darkest black) to 1.0 (lightest white)
     */
    getLuminance(hex) {
        const rgb = this.hexToRgb(hex);
        const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }

    /**
     * Calculate contrast ratio between two colors (WCAG)
     * @param {string} hex1 
     * @param {string} hex2 
     * @returns {number} Ratio between 1:1 and 21:1
     */
    getContrastRatio(hex1, hex2) {
        const l1 = this.getLuminance(hex1);
        const l2 = this.getLuminance(hex2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Inspect readability on Discord UI (Dark Theme #313338 and Light Theme #FFFFFF)
     * @param {string} hex 
     * @returns {{ darkContrast: number, lightContrast: number, rating: string }}
     */
    analyzeDiscordReadability(hex) {
        const darkContrast = parseFloat(this.getContrastRatio(hex, '#313338').toFixed(2));
        const lightContrast = parseFloat(this.getContrastRatio(hex, '#FFFFFF').toFixed(2));

        let rating = '⭐ Pristine Contrast';
        if (darkContrast < 2.0 && lightContrast < 2.0) {
            rating = '⚠️ Low visibility on both themes';
        } else if (darkContrast < 2.0) {
            rating = '🌙 Dim on Dark Theme (Best on Light)';
        } else if (lightContrast < 2.0) {
            rating = '☀️ Light Theme Washout (Best on Dark)';
        }

        return { darkContrast, lightContrast, rating };
    }

    /**
     * Generate visual markdown indicator for the blend transition
     * @param {string} hex1 
     * @param {string} hex2 
     * @param {string} blended 
     * @returns {string}
     */
    generateVisualBar(hex1, hex2, blended) {
        const steps = this.generateSteps(hex1, hex2, 7);
        const formatted = steps.map((s, idx) => {
            if (idx === 3) return `[ **${s}** ]`; // Midpoint
            return `\`${s}\``;
        }).join(' ➔ ');
        return formatted;
    }

    /**
     * Generate a random vibrant color blend
     * @returns {{ hex1: string, hex2: string, blended: string, name: string }}
     */
    randomBlend() {
        // Generate two aesthetically balanced HSL colors with high saturation (75-95%)
        const h1 = Math.floor(Math.random() * 360);
        // Ensure complementary or analogous pleasant offset
        const h2 = (h1 + (Math.random() > 0.5 ? 60 + Math.floor(Math.random() * 80) : 180 + Math.floor(Math.random() * 60))) % 360;

        const hex1 = this.hslToHex(h1, 85, 55);
        const hex2 = this.hslToHex(h2, 85, 55);
        const blended = this.blendColors(hex1, hex2, 0.5);

        return {
            hex1,
            hex2,
            blended,
            name: `Aura_${Math.floor(Math.random() * 9000 + 1000)}`
        };
    }

    /**
     * Convert Hex to HSL
     * @param {string} hex 
     * @returns {{ h: number, s: number, l: number }}
     */
    hexToHsl(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;

        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h, s;
        const l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                case gNorm: h = (bNorm - rNorm) / d + 2; break;
                case bNorm: h = (rNorm - gNorm) / d + 4; break;
            }
            h *= 60;
        }

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    /**
     * Get aesthetic emoji badge matching hex hue or preset
     * @param {string} hex 
     * @param {object} [preset] 
     * @returns {string}
     */
    getAestheticBadge(hex, preset = null) {
        if (preset?.emoji) return preset.emoji;
        const { h, l } = this.hexToHsl(hex);
        if (l < 18) return '🖤';
        if (l > 85) return '🤍';
        if (h >= 345 || h < 15) return '🔴';
        if (h >= 15 && h < 45) return '🟠';
        if (h >= 45 && h < 70) return '🟡';
        if (h >= 70 && h < 165) return '🟢';
        if (h >= 165 && h < 255) return '🔵';
        if (h >= 255 && h < 315) return '🟣';
        return '🌸';
    }

    /**
     * Get dual gradient badges representing start and end of spectrum
     * @param {string} hex1 
     * @param {string} [hex2] 
     * @param {object} [preset] 
     * @returns {string}
     */
    getGradientBadges(hex1, hex2 = null, preset = null) {
        if (preset?.emoji) return preset.emoji;
        const b1 = this.getAestheticBadge(hex1);
        if (!hex2 || hex1.toUpperCase() === hex2.toUpperCase()) return b1;
        const b2 = this.getAestheticBadge(hex2);
        return `${b1}➔${b2}`;
    }

    /**
     * Generate truecolor 24-bit ANSI gradient across a string of text
     * Rendered in Discord ```ansi codeblocks
     * @param {string} text 
     * @param {string} hex1 
     * @param {string} hex2 
     * @param {string} [hex3=null] 
     * @returns {string}
     */
    generateAnsiGradient(text, hex1, hex2, hex3 = null) {
        if (!text) return '';
        const c1 = this.hexToRgb(hex1);
        const c2 = this.hexToRgb(hex2 || hex1);
        const c3 = hex3 ? this.hexToRgb(hex3) : null;

        const interpolate = (start, end, t) => ({
            r: Math.round(start.r + (end.r - start.r) * t),
            g: Math.round(start.g + (end.g - start.g) * t),
            b: Math.round(start.b + (end.b - start.b) * t)
        });

        let res = '';
        const len = text.length;
        for (let i = 0; i < len; i++) {
            const t = len > 1 ? i / (len - 1) : 0.5;
            let c;
            if (c3) {
                if (t <= 0.5) c = interpolate(c1, c2, t * 2);
                else c = interpolate(c2, c3, (t - 0.5) * 2);
            } else {
                c = interpolate(c1, c2, t);
            }
            res += `\u001b[38;2;${c.r};${c.g};${c.b}m${text[i]}`;
        }
        return res + '\u001b[0m';
    }

    /**
     * Generate truecolor ANSI visual gradient spectrum bar
     * @param {string} hex1 
     * @param {string} hex2 
     * @param {string} [hex3=null] 
     * @param {number} [blocks=18] 
     * @returns {string}
     */
    generateAnsiBar(hex1, hex2, hex3 = null, blocks = 18) {
        const bar = '█'.repeat(blocks);
        return this.generateAnsiGradient(bar, hex1, hex2, hex3);
    }

    /**
     * Wrap ANSI gradient text and spectrum bar in a Discord-ready codeblock
     * @param {string} text 
     * @param {string} hex1 
     * @param {string} hex2 
     * @param {string} [hex3=null] 
     * @returns {string}
     */
    getGradientPreview(text, hex1, hex2, hex3 = null) {
        const ansiText = this.generateAnsiGradient(text, hex1, hex2, hex3);
        const barLength = Math.max(16, (text || '').length);
        const ansiBar = this.generateAnsiBar(hex1, hex2, hex3, barLength);
        return `\`\`\`ansi\n${ansiText}\n${ansiBar}\n\`\`\``;
    }

    /**
     * Convert HSL to Hex
     */
    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;
        const k = (n) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return this.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
    }

    /**
     * Resolve preset by id or friendly name
     * @param {string} query 
     * @returns {object|null}
     */
    getPreset(query) {
        if (!query) return null;
        const q = String(query).toLowerCase().trim().replace(/[-_\s]+/g, '_');
        if (PRESETS[q]) return PRESETS[q];

        for (const [key, val] of Object.entries(PRESETS)) {
            if (val.name.toLowerCase().includes(q) || key.includes(q)) {
                return val;
            }
        }
        return null;
    }

    /**
     * Get all presets grouped by category
     * @returns {Record<string, Array<object>>}
     */
    getPresetsByCategory() {
        const groups = {};
        for (const preset of Object.values(PRESETS)) {
            if (!groups[preset.category]) groups[preset.category] = [];
            groups[preset.category].push(preset);
        }
        return groups;
    }
}

module.exports = new ColorBlendEngine();
