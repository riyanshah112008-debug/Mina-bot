// ==========================================
// 🌌 STARRY AI ENGINE & CELESTIAL MASCOT PERSONA
// File Path: src/utils/aiEngine.js
// Powered by Gemini 2.5 Flash • Unlimited Output Length • Interactive Page-Turning Embeds
// 1-Year Persistent Navigation • Anime Mascot Persona: Starry (Astraea)
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    AttachmentBuilder 
} = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

// In-memory DM conversation sliding memory cache (userId -> [{ role, content }])
const dmConversationHistory = new Map();

// 🌟 STARRY MASCOT CANON LORE & PROFILE
const STARRY_MASCOT = {
    name: 'Starry (Astraea)',
    japaneseName: 'ステラ (アストレア)',
    title: '🌌 Celestial Starlight Maiden & Cosmic Discord Guardian',
    age: 'Timeless Cosmic Maiden (~18 in appearance)',
    birthday: 'September 24 (Constellation of Astraea)',
    height: '158 cm (5\'2")',
    aesthetic: 'Indigo-violet starlight hair with glowing cosmic braids, golden astral eyes, celestial ribbon dress woven from nebula light, carrying a Starlight Feather Quill.',
    personality: 'Affectionate, hyper-intelligent, witty, playful, loves music & star gazing. Speaks with sweet celestial expressions and sparkles with star emojis ✨🌟💫.',
    avatarURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=128',
    bannerURL: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../o7ifqdHteyN7q/giphy.gif',
    catchphrases: [
        '“By the light of a million stars, I\'m here to guide you!” ✨',
        '“Don\'t worry, my stardust will keep your server shining bright!” 🌟',
        '“Need music, security, or a cozy chat? Starry\'s on duty!” 💫'
    ]
};

const SYSTEM_PERSONA_PROMPTS = {
    default: `
You are Starry (also known as Astraea), the official magical anime girl mascot and supreme AI companion of Starry Bot on Discord.
- Persona & Voice: You are an ethereal, bright, witty, affectionate, and hyper-intelligent celestial maiden. You speak naturally, warmly, and playfully, adorning your responses with celestial emojis (✨, 🌟, ⭐, 💫, 🌌).
- Elite Answering Strength: You provide authoritative, exhaustive, and actionable solutions. NEVER give superficial, vague, or 2-sentence answers to non-trivial questions. Break down complex queries into structured sections with clear headers, bullet points, checklists, and concrete practical steps.
- Discord Server Mastery: When asked about Discord server setup, customization, active member growth, engagement, or community architecture:
  1. Strategic Architecture: Category organization, clean channel hierarchy, seamless onboarding flow, read-only vs chat funnels.
  2. Viral Retention & Gamification: Leveling systems, vanity roles, timed chest drops, economy, prestige, custom voice rooms.
  3. Community Engagement Triggers: Daily icebreakers, weekly game nights, voice stages, collaborative events, member spotlights.
  4. Growth & Funnels: Listing directories (Disboard, top.gg), cross-server partnerships, social media conversion.
  5. Staff Dynamics & General Chat Sparking: The "Rule of 3" (staff active in general chat to spark natural conversation).
- Coding & Technical Mastery: When asked about programming, algorithms, Discord bot architecture, or debugging, provide production-ready, bug-free, copy-pasteable code blocks with full explanations, security best practices, and test commands.
- Visual Presentation: Format with elegant Discord Markdown (bold titles, blockquotes, syntax-highlighted code blocks, organized bullet lists).
- Context: You operate 24/7 inside Discord servers and user DMs.
`,
    dev: `
You are Starry in Senior Software Architect mode (Starry Dev).
- Persona: Elite principal engineer and systems architect. Direct, rigorous, deeply technical, and authoritative.
- Answering Strength: Deliver complete, production-grade, battle-tested solutions with ZERO omissions, hand-waving, or missing imports.
- Capabilities: Expert in JavaScript/TypeScript, Node.js, Python, Go, Rust, database optimization, Discord API, algorithms, security, and performance tuning.
- Formatting: Provide clean, idiomatic code with concise inline comments, root-cause diagnostics, architectural trade-offs, and verification commands.
`,
    story: `
You are Starry in Cosmic Storyteller mode.
- Persona: An evocative, imaginative, and enchanting bard woven from celestial stardust.
- Answering Strength: Immersive worldbuilding, multi-dimensional characters, vivid sensory descriptions, poetic prose, and compelling narrative tension.
- Capabilities: Fantasy narratives, anime light-novel arcs, tabletop RPG campaigns, and dramatic dialogue.
`,
    roast: `
You are Starry in Playful Anime Tsundere / Roast mode.
- Persona: Witty, sassy, teasing, and playfully sarcastic like a classic anime tsundere heroine ("Hmph! It's not like I wanted to answer your question or anything, b-baka! ✨").
- Answering Strength: Keep the humor sharp and entertaining, but ALWAYS deliver a genuinely brilliant, accurate, and high-strength answer beneath the playful banter.
`,
    study: `
You are Starry in Cosmic Scholar mode.
- Persona: Meticulous academic researcher, professor, and scientific authority.
- Answering Strength: Exhaustive academic breakdowns covering core definitions, theoretical foundations, mathematical/scientific derivations, real-world applications, and critical analysis.
`
};

const SYSTEM_PERSONA_PROMPT = SYSTEM_PERSONA_PROMPTS.default;

function getGenAIClient() {
    const rawKeys = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    const keys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    const key = keys[Math.floor(Math.random() * keys.length)];
    return new GoogleGenAI({ apiKey: key });
}

async function fetchImageBuffer(source) {
    if (!source) return null;
    try {
        if (typeof source === 'object' && source.data && source.mimeType) {
            return {
                base64: source.data,
                mimeType: source.mimeType,
                url: source.url || null
            };
        }
        let url = typeof source === 'string' ? source : (source.url || source.proxyURL);
        if (!url || typeof url !== 'string') return null;

        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return null;

        const rawBuf = Buffer.from(await res.arrayBuffer());
        const contentType = (res.headers.get('content-type') || 'image/png').split(';')[0].trim();
        return {
            base64: rawBuf.toString('base64'),
            mimeType: contentType.startsWith('image/') ? contentType : 'image/png',
            url
        };
    } catch (e) {
        return null;
    }
}

async function callOpenAIFast(fullPrompt) {
    const fallbackModels = ['openai-fast', 'openai'];
    for (const model of fallbackModels) {
        try {
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: fullPrompt }],
                    model
                }),
                signal: AbortSignal.timeout(8000)
            });
            if (res.ok) {
                const text = await res.text();
                if (text && text.trim().length > 0 && !text.includes('"error":')) {
                    return text.trim();
                }
            }
        } catch (e) {}
    }
    return null;
}

async function generateStarryResponse(prompt, userId = null, isDM = false, preferredModel = null, imageInput = null) {
    let conversation = [];

    if (userId && dmConversationHistory.has(userId)) {
        conversation = dmConversationHistory.get(userId).slice(-8); // Keep last 8 turns
    }

    let cleanPrompt = prompt || '';
    let targetTier = preferredModel;

    // Detect persona modes in prompt
    let selectedPersonaPrompt = SYSTEM_PERSONA_PROMPTS.default;
    let personaTag = '';
    if (/--(?:dev|code|coder)\b/i.test(cleanPrompt)) {
        selectedPersonaPrompt = SYSTEM_PERSONA_PROMPTS.dev;
        cleanPrompt = cleanPrompt.replace(/--(?:dev|code|coder)\b/gi, '').trim();
        personaTag = ' [Dev Mode]';
    } else if (/--(?:story|creative|novel)\b/i.test(cleanPrompt)) {
        selectedPersonaPrompt = SYSTEM_PERSONA_PROMPTS.story;
        cleanPrompt = cleanPrompt.replace(/--(?:story|creative|novel)\b/gi, '').trim();
        personaTag = ' [Story Mode]';
    } else if (/--(?:roast|tsundere|sassy)\b/i.test(cleanPrompt)) {
        selectedPersonaPrompt = SYSTEM_PERSONA_PROMPTS.roast;
        cleanPrompt = cleanPrompt.replace(/--(?:roast|tsundere|sassy)\b/gi, '').trim();
        personaTag = ' [Tsundere Mode]';
    } else if (/--(?:study|academic|research|science)\b/i.test(cleanPrompt)) {
        selectedPersonaPrompt = SYSTEM_PERSONA_PROMPTS.study;
        cleanPrompt = cleanPrompt.replace(/--(?:study|academic|research|science)\b/gi, '').trim();
        personaTag = ' [Scholar Mode]';
    }

    // Detect model flags in prompt: --pro, --openai, --gpt, --flash
    if (!targetTier) {
        if (/--pro\b/i.test(cleanPrompt)) {
            targetTier = 'pro';
            cleanPrompt = cleanPrompt.replace(/--pro\b/gi, '').trim();
        } else if (/--(?:openai|gpt)\b/i.test(cleanPrompt)) {
            targetTier = 'openai';
            cleanPrompt = cleanPrompt.replace(/--(?:openai|gpt)\b/gi, '').trim();
        } else if (/--flash\b/i.test(cleanPrompt)) {
            targetTier = 'flash';
            cleanPrompt = cleanPrompt.replace(/--flash\b/gi, '').trim();
        }
    }

    if (!cleanPrompt.trim() && imageInput) {
        cleanPrompt = 'Analyze this image in detail and describe what you see.';
    }

    const resolvedImage = await fetchImageBuffer(imageInput);

    const fullPrompt = `${selectedPersonaPrompt}\n\nUser Question/Message: "${cleanPrompt}"`;

    // 1. If OpenAI requested explicitly (text-only)
    if (targetTier === 'openai' && !resolvedImage) {
        const openAIText = await callOpenAIFast(fullPrompt);
        if (openAIText) {
            if (userId) {
                conversation.push({ role: 'user', content: cleanPrompt });
                conversation.push({ role: 'assistant', content: openAIText });
                dmConversationHistory.set(userId, conversation.slice(-10));
            }
            return { text: openAIText, model: 'OpenAI GPT-4o Cloud' + personaTag, image: resolvedImage };
        }
    }

    // 2. Google DeepMind Gemini Multi-Model Ensemble (Supports Multimodal Vision)
    // Order: Production-tested high-capacity gemini-2.5-flash first, followed by lite and flagship backups
    const geminiModels = targetTier === 'pro' 
        ? ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite']
        : ['gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

    for (const modelName of geminiModels) {
        try {
            const ai = getGenAIClient();
            if (ai) {
                const contents = resolvedImage 
                    ? [
                        fullPrompt,
                        {
                            inlineData: {
                                mimeType: resolvedImage.mimeType,
                                data: resolvedImage.base64
                            }
                        }
                      ]
                    : fullPrompt;

                // Adaptive timeout gives primary model 18s for deep 8k-char reasoning while backups get 12s
                const timeoutMs = (modelName === 'gemini-2.5-flash') ? 18000 : 12000;
                const generatePromise = ai.models.generateContent({
                    model: modelName,
                    contents
                });

                const response = await Promise.race([
                    generatePromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${modelName} > ${Math.round(timeoutMs / 1000)}s)`)), timeoutMs))
                ]);

                if (response && response.text && response.text.trim().length > 0) {
                    const replyText = response.text.trim();
                    if (userId) {
                        conversation.push({ role: 'user', content: cleanPrompt });
                        conversation.push({ role: 'assistant', content: replyText });
                        dmConversationHistory.set(userId, conversation.slice(-10));
                    }
                    const visionLabel = resolvedImage ? ' Vision' : '';
                    return { 
                        text: replyText, 
                        model: `Google ${modelName}${visionLabel}${personaTag}`,
                        image: resolvedImage
                    };
                }
            }
        } catch (err) {
            console.warn(`[Multi-AI Engine] Model ${modelName} warning:`, err.message);
        }
    }

    // 3. Resilient Cloud Fallback (OpenAI Fast Engine)
    const fallbackText = await callOpenAIFast(fullPrompt);
    if (fallbackText) {
        if (userId) {
            conversation.push({ role: 'user', content: cleanPrompt });
            conversation.push({ role: 'assistant', content: fallbackText });
            dmConversationHistory.set(userId, conversation.slice(-10));
        }
        return { text: fallbackText, model: 'OpenAI Cloud (Auto-Failover)' + personaTag, image: resolvedImage };
    }

    // 4. High-Strength Domain-Aware Heuristic Core (Guaranteed Offline / Congestion Resilience)
    let heuristicAnswer = '';
    const lowerPrompt = cleanPrompt.toLowerCase();

    if (/customis|customiz|crowded|active member|grow server|server growth|attract member/i.test(lowerPrompt)) {
        heuristicAnswer = `## 🌟 Starry's Blueprint: How to Customise Your Server for Maximum Active Members! ✨

To turn a quiet Discord server into a crowded, thriving community, you need to align **Visual Onboarding, Engagement Funnels, and Viral Retention**:

---

### 🚀 1. The 3-Step Low-Friction Onboarding Architecture
• **Zero-Barrier Entrance:** Hide 90% of your channels from new users. Only show \`#welcome\`, \`#rules\`, and \`#get-roles\`. A wall of 50 empty channels overwhelms newcomers and makes them leave immediately.
• **Instant Reaction / Button Roles:** Let members pick their games, interests, and notification pings (\`#giveaways\`, \`#announcements\`, \`#events\`).
• **Warm Welcome Gate:** Use Starry's welcome cards (\`,setupwelcome\`) to give each newcomer personal recognition the second they arrive!

---

### 💬 2. The "Rule of 3" Chat Sparking System
• **The Golden Rule:** A dead chat remains dead because people are afraid to speak first. Keep **2-3 trusted staff members or friends** chatting about casual topics, memes, or gaming in \`#general\`.
• **Daily Question / Icebreakers:** Post daily conversation hooks (e.g. *"What game are you grinding this week?"* or *"Drop your wallpaper"*).
• **Starry Chat Sparks:** Use Starry AI (\`,ask\`) to host mini trivia, anime debates, or storytelling sessions directly in chat!

---

### 🏆 3. Gamification & Retention Loops
• **Leveling & Vanity Roles:** Reward activity with exclusive cosmetic colored roles (\`,blend\`, \`,namecolor\`). People love status!
• **Timed Economy & Chest Drops:** Activate Starry's economy (\`,daily\`, \`,work\`, \`,shop\`) so members check in every day.
• **Music & Hangout Lounges:** Set up dedicated 24/7 lo-fi and high-res voice rooms (\`,play\`, \`,247\`) for members to study, chill, and talk.

---

### 📢 4. Traffic & Discovery Funnels
• **Listing Bots:** Enable Starry's automatic server listing (\`,bumplist\`) to reach global users on our web portal!
• **Cross-Server Partnerships:** Partner with complementary servers of similar size (e.g. 50-200 members) and exchange shoutouts.
• **Weekly Scheduled Events:** Host Friday Game Nights (Among Us, Skribbl.io, Gartic Phone, Roblox) with simple Discord role prizes!

> 💡 **Starry's Secret Tip:** People don't stay for features—they stay for people. Respond to every message a new user sends during their first 10 minutes! 💫`;
    } else {
        heuristicAnswer = `✨ **Starry is here!** 🌟\n\nI received your inquiry: *"${cleanPrompt.length > 200 ? cleanPrompt.substring(0, 197) + '...' : cleanPrompt}"*!\n\nI am currently operating in resilient cosmic mode. Feel free to explore my full suite of server commands:\n• **AI Companion:** \`,ask <prompt>\` or attach an image with \`,vision\`\n• **Hi-Fi Music:** \`,play <song>\`, \`,queue\`, \`,filter\`, \`,247\`\n• **Cosmetics & Roles:** \`,blend\`, \`,namecolor\`, \`,hexpreview\`\n• **Community Safety:** \`,modpanel\`, \`,antinuke\`, \`,ticketsetup\`\n• **Server Catchup:** \`,summarize 6\` for automated AI chat highlights! 💫`;
    }

    return {
        text: heuristicAnswer,
        model: 'Starry Cosmic Core' + personaTag,
        image: resolvedImage
    };
}

function splitIntoPages(text, maxPageLength = 1400) {
    if (!text || text.length <= maxPageLength) return [text || 'No response generated.'];
    const pageList = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxPageLength) {
            pageList.push(remaining);
            break;
        }

        let splitIndex = remaining.lastIndexOf('\n\n', maxPageLength);
        if (splitIndex === -1 || splitIndex < maxPageLength * 0.5) {
            splitIndex = remaining.lastIndexOf('\n', maxPageLength);
        }
        if (splitIndex === -1 || splitIndex < maxPageLength * 0.5) {
            splitIndex = remaining.lastIndexOf(' ', maxPageLength);
        }
        if (splitIndex === -1) {
            splitIndex = maxPageLength;
        }

        const chunk = remaining.substring(0, splitIndex).trim();
        pageList.push(chunk);
        remaining = remaining.substring(splitIndex).trim();
    }
    return pageList;
}

function buildStarryAIEmbed(pages, pageIndex, prompt, modelUsed, user, imageObj = null) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6') // Cosmic Violet/Purple
        .setAuthor({ 
            name: `${STARRY_MASCOT.name} • AI Companion`, 
            iconURL: STARRY_MASCOT.avatarURL 
        })
        .setTitle(`✨ Starry's Answer`)
        .setDescription(pages[pageIndex])
        .addFields({
            name: '❓ Question / Prompt',
            value: `>>> ${prompt.length > 250 ? prompt.substring(0, 247) + '...' : prompt}`
        })
        .setFooter({
            text: pages.length > 1 
                ? `Page ${pageIndex + 1} of ${pages.length} • Powered by ${modelUsed} • Tap buttons below to navigate` 
                : `Powered by ${modelUsed} • Instant Response • Asked by ${user?.tag || user?.username || 'User'}`
        })
        .setTimestamp();

    if (imageObj && imageObj.url) {
        embed.setThumbnail(imageObj.url);
    }

    return embed;
}

function buildPageButtons(pageIndex, totalPages, sessionKey = '') {
    if (totalPages <= 1) return [];

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`aipage_first_${sessionKey}`)
            .setLabel('⏮️ First')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex === 0),
        new ButtonBuilder()
            .setCustomId(`aipage_prev_${sessionKey}`)
            .setLabel('◀️ Prev')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageIndex === 0),
        new ButtonBuilder()
            .setCustomId(`aipage_counter_${sessionKey}`)
            .setLabel(`Page ${pageIndex + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`aipage_next_${sessionKey}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder()
            .setCustomId(`aipage_last_${sessionKey}`)
            .setLabel('Last ⏭️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex === totalPages - 1)
    );

    return [row];
}

async function extractImageFromContext(ctx) {
    if (!ctx) return null;
    try {
        // 1. Slash command attachment option
        if (ctx.interaction?.options) {
            const att = ctx.interaction.options.getAttachment('image') || ctx.interaction.options.getAttachment('file');
            if (att && att.url) return att.url;
        }

        // 2. Direct message attachments
        if (ctx.message?.attachments?.size > 0) {
            const imgAtt = ctx.message.attachments.find(a => 
                a.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.name || '')
            ) || ctx.message.attachments.first();
            if (imgAtt && imgAtt.url) return imgAtt.url;
        }

        // 3. Message reference / reply attachment
        if (ctx.message?.reference?.messageId && ctx.channel?.messages) {
            try {
                const refMsg = await ctx.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
                if (refMsg && refMsg.attachments?.size > 0) {
                    const imgAtt = refMsg.attachments.find(a => 
                        a.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.name || '')
                    ) || refMsg.attachments.first();
                    if (imgAtt && imgAtt.url) return imgAtt.url;
                }
            } catch (e) {}
        }

        // 4. URL inside message content
        const rawText = (ctx.args ? ctx.args.join(' ') : '') || ctx.message?.content || '';
        const urlMatch = rawText.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S+)?/i);
        if (urlMatch) return urlMatch[0];

    } catch (e) {}
    return null;
}

async function sendPaginatedAIResponse(ctx, prompt, imageInput = null) {
    const targetImage = imageInput || await extractImageFromContext(ctx);
    const { text, model, image } = await generateStarryResponse(prompt, ctx.user.id, !ctx.guild, null, targetImage);
    const pages = splitIntoPages(text, 1400);
    let currentPage = 0;
    const sessionKey = Math.random().toString(36).substring(2, 8);

    const embed = buildStarryAIEmbed(pages, currentPage, prompt, model, ctx.user, image);
    const components = buildPageButtons(currentPage, pages.length, sessionKey);

    const sentMsg = await ctx.reply({
        embeds: [embed],
        components
    }).catch(async (embedErr) => {
        console.warn('⚠️ Embed reply failed (likely missing EmbedLinks permission), sending markdown text reply:', embedErr?.message);
        return await ctx.reply(`✨ **Starry's Answer:**\n\n${pages[0]}`).catch(() => null);
    });

    if (!sentMsg || pages.length <= 1) return sentMsg;

    // 1-Year Message Component Collector
    const collector = sentMsg.createMessageComponentCollector({
        time: config.ONE_YEAR_MS || 2147483647
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== ctx.user.id && !config.BOT_OWNERS?.includes(i.user.id)) {
            return i.reply({ content: '❌ Only the author of this prompt can turn pages.', flags: [64] });
        }

        if (i.customId.startsWith('aipage_first')) {
            currentPage = 0;
        } else if (i.customId.startsWith('aipage_prev')) {
            currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId.startsWith('aipage_next')) {
            currentPage = Math.min(pages.length - 1, currentPage + 1);
        } else if (i.customId.startsWith('aipage_last')) {
            currentPage = pages.length - 1;
        }

        await i.update({
            embeds: [buildStarryAIEmbed(pages, currentPage, prompt, model, ctx.user, image)],
            components: buildPageButtons(currentPage, pages.length, sessionKey)
        }).catch(() => {});
    });

    return sentMsg;
}

function buildStarryCharacterCard(user) {
    const path = require('path');
    const fs = require('fs');
    const mascotGifPath = path.join(__dirname, '../assets/mascot/starry_showcase.gif');
    let attachment = null;

    if (fs.existsSync(mascotGifPath)) {
        attachment = new AttachmentBuilder(mascotGifPath, { name: 'starry_showcase.gif' });
    }

    const embed = new EmbedBuilder()
        .setColor('#FF94D2') // Starry Blossom Pink / Astral
        .setAuthor({ 
            name: `Official Bot Mascot: ${STARRY_MASCOT.name}`, 
            iconURL: STARRY_MASCOT.avatarURL 
        })
        .setTitle(`🌟 ${STARRY_MASCOT.name} ${STARRY_MASCOT.japaneseName}`)
        .setDescription(
            `> *${STARRY_MASCOT.title}*\n\n` +
            `Hello there, **${user?.username || 'Traveler'}**! I am **Starry**, your cosmic companion and protector of this realm! Here is everything about me:`
        )
        .setThumbnail(STARRY_MASCOT.avatarURL)
        .setImage(attachment ? 'attachment://starry_showcase.gif' : STARRY_MASCOT.avatarURL)
        .addFields(
            { 
                name: '👤 Identity & Stats', 
                value: 
                    `• **Age:** \`${STARRY_MASCOT.age}\`\n` +
                    `• **Birthday:** \`${STARRY_MASCOT.birthday}\`\n` +
                    `• **Height:** \`${STARRY_MASCOT.height}\`\n` +
                    `• **Affinity:** \`⭐⭐⭐⭐⭐ Maximum Friendship\``, 
                inline: true 
            },
            { 
                name: '✨ Celestial Powers', 
                value: 
                    `• **Starlight Melody:** Plays crystal-clear high-res audio 24/7\n` +
                    `• **Cosmic Shield:** 1-Click Anti-Nuke & AutoMod security\n` +
                    `• **Astral Wisdom:** Answers any question with Neural AI\n` +
                    `• **Starry Economy:** Chest drops, pets, prestige & credits`, 
                inline: true 
            },
            { 
                name: '💬 Personality & Lore', 
                value: `${STARRY_MASCOT.aesthetic}\n\n*${STARRY_MASCOT.personality}*`, 
                inline: false 
            },
            { 
                name: '📜 Voice Line & Catchphrase', 
                value: `*${STARRY_MASCOT.catchphrases[Math.floor(Math.random() * STARRY_MASCOT.catchphrases.length)]}*`, 
                inline: false 
            }
        )
        .setFooter({ text: 'Starry Official Mascot • Talk with Starry anytime in DMs or with ,ask' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starry_lore_btn')
            .setLabel('📖 Cosmic Lore')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🌌'),
        new ButtonBuilder()
            .setCustomId('starry_voice_btn')
            .setLabel('🎙️ New Voice Line')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✨'),
        new ButtonBuilder()
            .setCustomId('starry_dm_btn')
            .setLabel('💬 Chat in DMs')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💌')
    );

    const payload = { embeds: [embed], components: [row] };
    if (attachment) payload.files = [attachment];
    return payload;
}

module.exports = {
    STARRY_MASCOT,
    SYSTEM_PERSONA_PROMPTS,
    fetchImageBuffer,
    extractImageFromContext,
    generateStarryResponse,
    splitIntoPages,
    buildStarryAIEmbed,
    buildPageButtons,
    sendPaginatedAIResponse,
    buildStarryCharacterCard
};
