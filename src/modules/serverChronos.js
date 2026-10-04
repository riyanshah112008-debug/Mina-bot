// ==========================================
// ⏳ STARRY CHRONOS: PREDICTIVE SERVER TIME-MACHINE & GOLDEN HOUR ENGINE
// File Path: src/modules/serverChronos.js
// Circadian Rhythm Forecaster • Peak Engagement Windows
// Inferred Global Timezone Centroid • AI Scheduling Directives
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

const REGION_MAP = [
    { start: 7, end: 12, region: 'East Asia / SE Asia / Oceania (UTC+8 to +10)' },
    { start: 13, end: 17, region: 'South Asia / India (UTC+5:30 to +6)' },
    { start: 18, end: 22, region: 'Europe / Middle East / Africa (UTC+0 to +3)' },
    { start: 23, end: 6, region: 'The Americas (PST / EST / UTC-5 to -8)' }
];

function inferDominantRegion(peakHourUTC) {
    for (const r of REGION_MAP) {
        if (r.start <= r.end) {
            if (peakHourUTC >= r.start && peakHourUTC <= r.end) return r.region;
        } else {
            // Wraps past midnight
            if (peakHourUTC >= r.start || peakHourUTC <= r.end) return r.region;
        }
    }
    return 'Global Distributed Audience';
}

function renderMiniBar(value, max, width = 8) {
    if (max <= 0) return '░'.repeat(width);
    const filled = Math.min(width, Math.max(0, Math.round((value / max) * width)));
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Performs deep chronological sampling of server messages and predicts optimal engagement slots
 */
async function analyzeServerChronos(guild, requester = null) {
    // 1. Fetch recent messages across text channels (up to 5 channels, 100 messages each)
    const textChannels = Array.from(guild.channels.cache.values())
        .filter(c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) && c.viewable)
        .slice(0, 6);

    const hourlyCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0); // 0 = Sunday
    let totalMessagesSampled = 0;
    let recentOneHourMessages = 0;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const ch of textChannels) {
        try {
            const msgs = await ch.messages.fetch({ limit: 100 }).catch(() => null);
            if (!msgs) continue;

            for (const msg of msgs.values()) {
                if (msg.author?.bot) continue; // Pure human communication analysis
                totalMessagesSampled++;

                const d = new Date(msg.createdTimestamp);
                const hourUTC = d.getUTCHours();
                const day = d.getUTCDay();

                hourlyCounts[hourUTC]++;
                dayCounts[day]++;

                if (msg.createdTimestamp >= oneHourAgo) {
                    recentOneHourMessages++;
                }
            }
        } catch (e) {}
    }

    // 2. Statistical Analysis
    const maxHourCount = Math.max(...hourlyCounts, 1);
    let peakHourUTC = 0;
    let troughHourUTC = 0;
    let minHourCount = Infinity;

    for (let h = 0; h < 24; h++) {
        if (hourlyCounts[h] > hourlyCounts[peakHourUTC]) {
            peakHourUTC = h;
        }
        if (hourlyCounts[h] < minHourCount) {
            minHourCount = hourlyCounts[h];
            troughHourUTC = h;
        }
    }

    const averagePerHour = Math.round(totalMessagesSampled / 24);
    const velocityFactor = averagePerHour > 0 ? (recentOneHourMessages / averagePerHour).toFixed(1) : 1.0;

    let serverState = '🟢 VIBRANT';
    let stateColor = '#2ECC71';
    if (velocityFactor >= 2.0) {
        serverState = '🔥 ACTIVITY SURGE (Peak Wave)';
        stateColor = '#E67E22';
    } else if (velocityFactor < 0.5) {
        serverState = '🌙 QUIET NIGHTS (Low Activity Window)';
        stateColor = '#95A5A6';
    }

    // 3. Compute Next Golden Hour Timestamp
    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    let hoursUntilPeak = (peakHourUTC - currentHourUTC + 24) % 24;
    if (hoursUntilPeak === 0 && now.getUTCMinutes() > 30) {
        hoursUntilPeak = 24; // Next day
    }

    const nextGoldenTime = new Date(now.getTime() + (hoursUntilPeak * 3600 * 1000));
    nextGoldenTime.setUTCMinutes(0, 0, 0);
    const nextGoldenUnix = Math.floor(nextGoldenTime.getTime() / 1000);

    const inferredRegion = inferDominantRegion(peakHourUTC);

    // 4. Construct 4-Quarter Visual Diurnal Heatmap
    // Night (00-05 UTC), Morning (06-11 UTC), Afternoon (12-17 UTC), Evening (18-23 UTC)
    const quarterTotals = [
        hourlyCounts.slice(0, 6).reduce((a, b) => a + b, 0),
        hourlyCounts.slice(6, 12).reduce((a, b) => a + b, 0),
        hourlyCounts.slice(12, 18).reduce((a, b) => a + b, 0),
        hourlyCounts.slice(18, 24).reduce((a, b) => a + b, 0)
    ];
    const maxQuarter = Math.max(...quarterTotals, 1);

    const heatmapVisual = [
        `🌌 **00h - 05h UTC** \`[${renderMiniBar(quarterTotals[0], maxQuarter)}]\` ${quarterTotals[0]} msgs ${peakHourUTC < 6 ? '⭐ *(Golden Peak)*' : ''}`,
        `🌅 **06h - 11h UTC** \`[${renderMiniBar(quarterTotals[1], maxQuarter)}]\` ${quarterTotals[1]} msgs ${peakHourUTC >= 6 && peakHourUTC < 12 ? '⭐ *(Golden Peak)*' : ''}`,
        `☀️ **12h - 17h UTC** \`[${renderMiniBar(quarterTotals[2], maxQuarter)}]\` ${quarterTotals[2]} msgs ${peakHourUTC >= 12 && peakHourUTC < 18 ? '⭐ *(Golden Peak)*' : ''}`,
        `🌆 **18h - 23h UTC** \`[${renderMiniBar(quarterTotals[3], maxQuarter)}]\` ${quarterTotals[3]} msgs ${peakHourUTC >= 18 ? '⭐ *(Golden Peak)*' : ''}`
    ].join('\n');

    // 5. AI Community Scheduling Strategy via Gemini Flash
    let aiAdvice = null;
    const apiKey = getGeminiApiKey();

    if (apiKey && totalMessagesSampled > 10) {
        try {
            const prompt = `You are an elite Community Architect and Data Scientist.
Analyze this Discord server's chronological activity metrics:
- Server Name: "${guild.name}"
- Sampled Human Messages: ${totalMessagesSampled} across ${textChannels.length} channels
- Peak Activity Hour: ${peakHourUTC}:00 UTC
- Lowest Activity Hour: ${troughHourUTC}:00 UTC
- Current Chat Velocity: ${velocityFactor}x baseline
- Inferred Member Geo-Cluster: ${inferredRegion}

In 2 short bullet points:
1. 🎯 **Optimal Announcement & Event Drop**: Give the precise window to post announcements or host giveaways to maximize live reach without getting buried.
2. 💡 **Downtime Bridge Strategy**: One concrete recommendation to prevent chat decay during the ${troughHourUTC}:00 UTC lull.
Keep it strictly concise, actionable, and formatted in clean markdown.`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
                })
            });

            if (res.ok) {
                const data = await res.json();
                aiAdvice = data.candidates?.[0]?.content?.parts?.[0]?.text;
            }
        } catch (e) {
            console.error('⚠️ [ServerChronos AI Error]:', e.message);
        }
    }

    if (!aiAdvice) {
        aiAdvice = `🎯 **Optimal Announcement Slot**: Schedule major announcements or events around **${peakHourUTC}:00 UTC** (<t:${nextGoldenUnix}:R>) when chat volume and active member attention reach their daily apex.\n💡 **Downtime Bridge**: Leverage automated daily question prompts (e.g. \`,spark\`) during **${troughHourUTC}:00 UTC** to bridge the lull.`;
    }

    // Build the Chronos Discord Embed
    const embed = new EmbedBuilder()
        .setColor(stateColor)
        .setTitle(`⏳ Starry Chronos: Predictive Server Time-Machine`)
        .setDescription(`**Server Pulse:** \`${serverState}\` (Velocity: \`${velocityFactor}x\`)\n**Analyzed:** \`${totalMessagesSampled}\` human messages across \`${textChannels.length}\` core channels\n\n*Chronological predictive modeling powered by Starry Autonomous Intelligence*`)
        .addFields(
            {
                name: '🎯 Upcoming Golden Engagement Slot',
                value: `• **Next Apex Window:** <t:${nextGoldenUnix}:F> (<t:${nextGoldenUnix}:R>)\n• **Daily Peak Hour:** \`${peakHourUTC}:00 - ${(peakHourUTC + 1) % 24}:00 UTC\`\n• **Quiet Lull Hour:** \`${troughHourUTC}:00 - ${(troughHourUTC + 1) % 24}:00 UTC\``,
                inline: false
            },
            {
                name: '🌍 Inferred Community Timezone Centroid',
                value: `• **Dominant Region:** \`${inferredRegion}\`\n• *Calculated from circadian message distribution curves and daylight chat peaks.*`,
                inline: false
            },
            {
                name: '📊 24-Hour Diurnal Activity Wave',
                value: heatmapVisual,
                inline: false
            },
            {
                name: '🧠 AI Community Architect Strategy',
                value: aiAdvice.length > 900 ? aiAdvice.slice(0, 897) + '...' : aiAdvice,
                inline: false
            }
        )
        .setFooter({ text: `Requested by ${requester?.tag || 'Member'} • Starry Chronos Engine`, iconURL: requester?.displayAvatarURL?.() })
        .setTimestamp();

    const components = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('chronos_dm')
                .setLabel('Save Forecast to DM')
                .setEmoji('📬')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('chronos_remind')
                .setLabel('Remind Me for Golden Hour')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('chronos_refresh')
                .setLabel('Re-Forecast')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Success)
        )
    ];

    return { embed, components, peakHourUTC, nextGoldenUnix, inferredRegion };
}

module.exports = {
    analyzeServerChronos,
    inferDominantRegion
};
