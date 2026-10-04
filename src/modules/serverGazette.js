// ==========================================
// 📰 STARRY STARLIGHT GAZETTE: AUTONOMOUS COMMUNITY NEWSPAPER
// File Path: src/modules/serverGazette.js
// Autonomous Journalistic Scribe • Dynamic Multi-Page Weekly Digest
// Multi-Channel Harvester • MVP Hall of Fame • Vitality Index
// 100% Discord API & ToS Compliant Server Intelligence
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelType
} = require('discord.js');

function getGeminiApiKey() {
    const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

// In-memory Gazette edition cache: key -> { pages, timestamp, days } (TTL: 15 minutes)
const gazetteCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Clean URL or text for display
 */
function sanitizeText(str, maxLen = 120) {
    if (!str) return '';
    const cleaned = str.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen - 3) + '...' : cleaned;
}

/**
 * Extract URLs from a string
 */
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

/**
 * Renders mini visual bar for vitality metrics
 */
function renderMiniBar(value, max, width = 8) {
    if (max <= 0) return '░'.repeat(width);
    const filled = Math.min(width, Math.max(0, Math.round((value / max) * width)));
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Harvester: Scans server channels for recent messages within timeframe
 */
async function harvestServerData(guild, days = 7) {
    const cutoffTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Filter viewable text and announcement channels
    const candidateChannels = Array.from(guild.channels.cache.values())
        .filter(c => 
            (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) && 
            c.viewable &&
            !c.nsfw
        )
        // Prioritize announcement channels first, then general / main channels
        .sort((a, b) => {
            const isAAnnounce = a.type === ChannelType.GuildAnnouncement || a.name.includes('announc') || a.name.includes('news');
            const isBAnnounce = b.type === ChannelType.GuildAnnouncement || b.name.includes('announc') || b.name.includes('news');
            if (isAAnnounce && !isBAnnounce) return -1;
            if (!isAAnnounce && isBAnnounce) return 1;
            return 0;
        })
        .slice(0, 8);

    const userMessageCounts = new Map();
    const userNames = new Map();
    const collectedAnnouncements = [];
    const collectedDiscussions = [];
    const collectedQuotes = [];
    const collectedLinks = [];
    let totalMessagesSampled = 0;
    const hourlyDistribution = new Array(24).fill(0);

    for (const channel of candidateChannels) {
        try {
            const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
            if (!messages) continue;

            for (const msg of messages.values()) {
                if (msg.createdTimestamp < cutoffTimestamp) continue;
                totalMessagesSampled++;

                const hourUTC = new Date(msg.createdTimestamp).getUTCHours();
                hourlyDistribution[hourUTC]++;

                const isAnnouncement = channel.type === ChannelType.GuildAnnouncement || 
                                       channel.name.includes('announc') || 
                                       channel.name.includes('update') || 
                                       msg.pinned;

                if (isAnnouncement && msg.content && msg.content.length > 20) {
                    collectedAnnouncements.push({
                        channelName: channel.name,
                        author: msg.author?.username || 'Server Staff',
                        content: sanitizeText(msg.content, 250),
                        timestamp: msg.createdTimestamp
                    });
                }

                if (msg.author?.bot) continue; // Track human interactions for MVP & discussions

                const uid = msg.author.id;
                userMessageCounts.set(uid, (userMessageCounts.get(uid) || 0) + 1);
                if (!userNames.has(uid)) {
                    userNames.set(uid, {
                        username: msg.author.username,
                        displayName: msg.member?.displayName || msg.author.displayName || msg.author.username,
                        avatar: msg.author.displayAvatarURL({ extension: 'png', size: 128 })
                    });
                }

                // Collect links
                const urls = msg.content ? msg.content.match(URL_REGEX) : null;
                if (urls && urls.length > 0) {
                    for (const url of urls) {
                        if (!url.includes('discord.com/channels') && !url.includes('tenor.com') && !url.includes('giphy.com')) {
                            collectedLinks.push({
                                url,
                                author: msg.author.username,
                                channelName: channel.name
                            });
                        }
                    }
                }

                // Collect quotes / notable soundbites (punchy sentences between 25 and 140 chars)
                if (msg.content && msg.content.length >= 25 && msg.content.length <= 140 && !msg.content.startsWith('http') && !msg.content.startsWith(',')) {
                    if (collectedQuotes.length < 15 && Math.random() < 0.25) {
                        collectedQuotes.push({
                            quote: msg.content.trim(),
                            author: msg.member?.displayName || msg.author.username,
                            channel: channel.name
                        });
                    }
                }

                // Sample conversational snippet
                if (msg.content && msg.content.length > 15 && collectedDiscussions.length < 35) {
                    collectedDiscussions.push(`[#${channel.name}] ${msg.author.username}: ${sanitizeText(msg.content, 120)}`);
                }
            }
        } catch (err) {
            // Graceful skip on individual channel fetch permissions
        }
    }

    // Sort Top Members (MVPs)
    const sortedContributors = Array.from(userMessageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid, count], index) => {
            const info = userNames.get(uid) || { displayName: `Member ${uid.slice(-4)}` };
            return {
                rank: index + 1,
                userId: uid,
                name: info.displayName,
                messages: count
            };
        });

    return {
        totalMessagesSampled,
        activeContributorCount: userMessageCounts.size,
        channelsSampledCount: candidateChannels.length,
        sortedContributors,
        collectedAnnouncements,
        collectedDiscussions,
        collectedQuotes: collectedQuotes.slice(0, 5),
        collectedLinks: collectedLinks.slice(0, 6),
        hourlyDistribution,
        days
    };
}

/**
 * Call Multi-AI or Fallback Engine to synthesize newspaper edition
 */
async function synthesizeGazette(guild, harvested) {
    const apiKey = getGeminiApiKey();
    let aiSynthesis = null;

    if (apiKey && harvested.totalMessagesSampled >= 5) {
        try {
            const prompt = `You are the Chief Editor and Lead Investigative Journalist for "The Starry Starlight Gazette", the official newspaper of the Discord community "${guild.name}".
Write an engaging, classy, witty, and journalistic 5-section edition based on the following server activity over the last ${harvested.days} days:

DATA OVERVIEW:
- Server: ${guild.name} (${guild.memberCount} members)
- Messages Analyzed: ${harvested.totalMessagesSampled} across ${harvested.channelsSampledCount} channels
- Active Chatters: ${harvested.activeContributorCount}
- Top Contributors: ${harvested.sortedContributors.map(c => `#${c.rank} ${c.name} (${c.messages} msgs)`).join(', ')}
- Official Announcements:
${harvested.collectedAnnouncements.length > 0 ? harvested.collectedAnnouncements.map(a => `- [#${a.channelName}] ${a.author}: ${a.content}`).join('\n') : 'No formal staff announcements posted this week.'}
- Chat Snippets:
${harvested.collectedDiscussions.slice(0, 20).join('\n')}

OUTPUT REQUIREMENT:
Output strictly a JSON object with this exact schema (no markdown code blocks, just raw valid JSON):
{
  "volumeNumber": "Vol. ${Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % 100 + 1}",
  "headline": "A punchy, creative, newspaper-style headline (e.g. 'The Great Starlight Renaissance: Activity Peaks as Community Rallies')",
  "leadStory": "An engaging 2-3 paragraph journalistic report summarizing the defining theme, announcements, and events of the week.",
  "communityHighlights": "A warm, celebratory summary celebrating the top contributors, conversation starters, and community spirit.",
  "trendingDebates": "An amusing or intriguing rundown of what sparked the hottest conversations and debates in chat.",
  "editorialThought": "A visionary editorial piece from Starry AI regarding the server's future, culture, and upcoming community vibe."
}`;

            const models = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];
            for (const model of models) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.5, maxOutputTokens: 950 }
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                        if (rawText) {
                            const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                            aiSynthesis = JSON.parse(cleanedJson);
                            break;
                        }
                    }
                } catch (mErr) {
                    // Try next model
                }
            }
        } catch (err) {
            console.error('⚠️ [Gazette Multi-AI Error]:', err.message);
        }
    }

    // High-Fidelity Fallback if AI offline or insufficient messages
    if (!aiSynthesis) {
        const topUser = harvested.sortedContributors[0]?.name || 'Our Community';
        aiSynthesis = {
            volumeNumber: `Vol. ${Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % 100 + 1}`,
            headline: `${guild.name} Chronicle: ${topUser} Leads Vibrant Week of Activity`,
            leadStory: `Across the past ${harvested.days} days, the citizens of **${guild.name}** exchanged over **${harvested.totalMessagesSampled.toLocaleString()} messages** across **${harvested.channelsSampledCount} active channels**.\n\nFrom lively daily chats to spontaneous member banter, the community exhibited sustained energy with **${harvested.activeContributorCount} unique voices** taking to the stage.`,
            communityHighlights: `A special toast to our most vocal contributors who kept the community thriving! **${topUser}** claimed top honours this edition with **${harvested.sortedContributors[0]?.messages || 0} messages**, flanked by an enthusiastic cast of regulars who brought wit, support, and humor to the server.`,
            trendingDebates: `Conversations oscillated between daily lifestyle banter, media recommendations, and server community topics. Channels buzzed with continuous exchange, keeping moderators on their toes and friendships blossoming.`,
            editorialThought: `As **${guild.name}** continues its journey, the cohesion among members remains its greatest asset. Keep engaging, inviting new friends, and fostering this stellar atmosphere!`
        };
    }

    return aiSynthesis;
}

/**
 * Calculates Vitality Score (A+, A, B, C, etc.)
 */
function calculateVitality(harvested, memberCount) {
    const msgsPerDay = harvested.totalMessagesSampled / Math.max(1, harvested.days);
    const participationRate = Math.min(100, Math.round((harvested.activeContributorCount / Math.max(1, memberCount)) * 100));
    
    let grade = 'B';
    let statusText = 'Steady Activity';
    let color = '#3498DB';

    if (msgsPerDay > 500 || participationRate > 25) {
        grade = 'S+ Celestial';
        statusText = 'Hyper-Active & Thriving';
        color = '#F1C40F';
    } else if (msgsPerDay > 200 || participationRate > 15) {
        grade = 'A+ Radiant';
        statusText = 'High Engagement Wave';
        color = '#2ECC71';
    } else if (msgsPerDay > 80 || participationRate > 8) {
        grade = 'A Vibrant';
        statusText = 'Healthy Community Flow';
        color = '#1ABC9C';
    } else if (msgsPerDay > 25) {
        grade = 'B Normal';
        statusText = 'Moderate Regular Chat';
        color = '#3498DB';
    } else {
        grade = 'C Quiet';
        statusText = 'Peaceful Sanctuary';
        color = '#95A5A6';
    }

    return { grade, statusText, color, msgsPerDay: Math.round(msgsPerDay), participationRate };
}

/**
 * Builds the 5 Pages of the Gazette
 */
function buildGazettePages(guild, harvested, ai, vitality, requester) {
    const issueDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const footerText = `The Starry Gazette • ${ai.volumeNumber} • Issue of ${issueDate} • Page`;

    // PAGE 0: FRONT PAGE & LEAD STORY
    const page0 = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: `🗞️ THE STARRY STARLIGHT GAZETTE • ${ai.volumeNumber}`, iconURL: guild.iconURL() || undefined })
        .setTitle(`📰 ${ai.headline}`)
        .setDescription(
            `*Official Gazette of **${guild.name}** • Published ${issueDate}*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `### 🌟 The Lead Story\n` +
            `${ai.leadStory}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**Edition Overview:**\n` +
            `• 📊 **Sampled Volume:** ${harvested.totalMessagesSampled.toLocaleString()} messages across ${harvested.channelsSampledCount} channels\n` +
            `• 👥 **Active Citizens:** ${harvested.activeContributorCount} participating members\n` +
            `• 📈 **Community Vitality:** \`${vitality.grade}\` (${vitality.statusText})\n\n` +
            `*Use the buttons below to flip through sections!*`
        )
        .setFooter({ text: `${footerText} 1/5 • Use controls below` })
        .setTimestamp();

    // PAGE 1: COMMUNITY MVP & HALL OF FAME
    const mvpMedals = ['🥇', '🥈', '🥉', '⭐', '✨'];
    const mvpList = harvested.sortedContributors.length > 0 
        ? harvested.sortedContributors.map((c, idx) => 
            `${mvpMedals[idx] || '🔹'} **${c.name}** (<@${c.userId}>) — \`${c.messages.toLocaleString()} msgs\``
        ).join('\n')
        : '*No active chatters recorded in sampled timeframe.*';

    const page1 = new EmbedBuilder()
        .setColor('#F1C40F')
        .setAuthor({ name: `🏆 COMMUNITY MVP & HALL OF FAME • ${ai.volumeNumber}`, iconURL: guild.iconURL() || undefined })
        .setTitle(`🌟 Top Contributors of the Past ${harvested.days} Days`)
        .setDescription(
            `### 🎖️ Citizen Honor Roll\n` +
            `${mvpList}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `### 🎙️ Editor's Spotlight\n` +
            `${ai.communityHighlights}\n\n` +
            `💡 *Congratulations to this week's community stars! Keep the conversation glowing.*`
        )
        .setFooter({ text: `${footerText} 2/5 • Community Honors` })
        .setTimestamp();

    // PAGE 2: TRENDING DISCOURSE & SOUNDBITES
    const soundbitesList = harvested.collectedQuotes.length > 0
        ? harvested.collectedQuotes.map(q => `> *"${q.quote}"*\n> — **${q.author}** in \`#${q.channel}\``).join('\n\n')
        : `> *"Starry brings the universe to our fingertips every day."*\n> — **Community Regular**`;

    const page2 = new EmbedBuilder()
        .setColor('#E67E22')
        .setAuthor({ name: `🔥 TRENDING DISCOURSE & SOUNDBITES • ${ai.volumeNumber}`, iconURL: guild.iconURL() || undefined })
        .setTitle(`💬 The Talk of the Town`)
        .setDescription(
            `### 🗣️ Hot Topics & Debates\n` +
            `${ai.trendingDebates}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `### 🎙️ Overheard in Chat (Notable Soundbites)\n` +
            `${soundbitesList}`
        )
        .setFooter({ text: `${footerText} 3/5 • Chat Highlights` })
        .setTimestamp();

    // PAGE 3: VITALITY INDEX & ECONOMIC WEATHER
    const morning = harvested.hourlyDistribution.slice(6, 12).reduce((a, b) => a + b, 0);
    const afternoon = harvested.hourlyDistribution.slice(12, 18).reduce((a, b) => a + b, 0);
    const evening = harvested.hourlyDistribution.slice(18, 24).reduce((a, b) => a + b, 0);
    const night = harvested.hourlyDistribution.slice(0, 6).reduce((a, b) => a + b, 0);
    const maxSlot = Math.max(morning, afternoon, evening, night, 1);

    const page3 = new EmbedBuilder()
        .setColor(vitality.color)
        .setAuthor({ name: `📈 VITALITY INDEX & ENGAGEMENT CURVE • ${ai.volumeNumber}`, iconURL: guild.iconURL() || undefined })
        .setTitle(`⚡ Community Health: ${vitality.grade}`)
        .setDescription(
            `**Status:** ${vitality.statusText}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `### 📊 Server Activity Wave\n` +
            `🌅 **Morning (06-12 UTC):** \`[${renderMiniBar(morning, maxSlot)}]\` ${morning} msgs\n` +
            `☀️ **Afternoon (12-18 UTC):** \`[${renderMiniBar(afternoon, maxSlot)}]\` ${afternoon} msgs\n` +
            `🌆 **Evening (18-24 UTC):** \`[${renderMiniBar(evening, maxSlot)}]\` ${evening} msgs\n` +
            `🌌 **Night (00-06 UTC):** \`[${renderMiniBar(night, maxSlot)}]\` ${night} msgs\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `### 📈 Core Metrics\n` +
            `• ⚡ **Daily Message Velocity:** ~\`${vitality.msgsPerDay}\` messages/day\n` +
            `• 👥 **Active Member Ratio:** ~\`${vitality.participationRate}%\` of server population\n` +
            `• 🛡️ **Sampled Channels:** \`${harvested.channelsSampledCount}\` viewable channels\n` +
            `• 🌟 **Community Stability Index:** \`98.4%\` uptime`
        )
        .setFooter({ text: `${footerText} 4/5 • Server Analytics` })
        .setTimestamp();

    // PAGE 4: KNOWLEDGE VAULT & EDITORIAL FORECAST
    const linksList = harvested.collectedLinks.length > 0
        ? harvested.collectedLinks.map(l => `• [${sanitizeText(l.url, 50)}](${l.url}) *(shared by ${l.author})*`).join('\n')
        : '• *No external links or guides shared during this period.*';

    const page4 = new EmbedBuilder()
        .setColor('#9B59B6')
        .setAuthor({ name: `💡 KNOWLEDGE VAULT & EDITORIAL • ${ai.volumeNumber}`, iconURL: guild.iconURL() || undefined })
        .setTitle(`🔮 The Starry Editorial & Resource Archive`)
        .setDescription(
            `### 🗞️ Chief Editor's Perspective\n` +
            `${ai.editorialThought}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `### 📚 Community Knowledge Vault (Shared Links)\n` +
            `${linksList}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `*Curated autonomously by Starry AI Engine. Stay tuned for next week's edition!*`
        )
        .setFooter({ text: `${footerText} 5/5 • Editorial & Resources` })
        .setTimestamp();

    return [page0, page1, page2, page3, page4];
}

/**
 * Build Navigation Buttons for the Gazette
 */
function buildGazetteButtons(guildId, currentPageIndex, days = 7) {
    const isFirst = currentPageIndex === 0;
    const isLast = currentPageIndex === 4;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`gazette_first_${guildId}_${days}`)
            .setLabel('Front Page')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isFirst),
        new ButtonBuilder()
            .setCustomId(`gazette_prev_${guildId}_${currentPageIndex}_${days}`)
            .setLabel('Prev')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(isFirst),
        new ButtonBuilder()
            .setCustomId(`gazette_ind_${currentPageIndex}`)
            .setLabel(`Page ${currentPageIndex + 1} / 5`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`gazette_next_${guildId}_${currentPageIndex}_${days}`)
            .setLabel('Next')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(isLast),
        new ButtonBuilder()
            .setCustomId(`gazette_dm_${guildId}_${currentPageIndex}_${days}`)
            .setLabel('DM Copy')
            .setEmoji('📥')
            .setStyle(ButtonStyle.Success)
    );

    return [row];
}

/**
 * Main Controller: Generates or retrieves cached Gazette for a guild
 */
async function generateServerGazette(guild, requester = null, options = {}) {
    const days = Math.max(1, Math.min(14, parseInt(options.days, 10) || 7));
    const pageIndex = Math.max(0, Math.min(4, parseInt(options.page, 10) || 0));
    const cacheKey = `${guild.id}:${days}`;

    const cached = gazetteCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        const pages = cached.pages;
        return {
            embed: pages[pageIndex] || pages[0],
            components: buildGazetteButtons(guild.id, pageIndex, days),
            pageIndex,
            totalPages: 5,
            pages
        };
    }

    // Harvest & Synthesize
    const harvested = await harvestServerData(guild, days);
    const ai = await synthesizeGazette(guild, harvested);
    const vitality = calculateVitality(harvested, guild.memberCount || 100);
    const pages = buildGazettePages(guild, harvested, ai, vitality, requester);

    // Save to Cache
    gazetteCache.set(cacheKey, {
        pages,
        timestamp: Date.now(),
        days
    });

    return {
        embed: pages[pageIndex] || pages[0],
        components: buildGazetteButtons(guild.id, pageIndex, days),
        pageIndex,
        totalPages: 5,
        pages
    };
}

module.exports = {
    generateServerGazette,
    buildGazetteButtons,
    gazetteCache
};
