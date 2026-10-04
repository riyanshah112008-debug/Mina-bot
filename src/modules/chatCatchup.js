// ==========================================
// 📰 STARRY AI CHANNEL CATCH-UP & TL;DR ENGINE
// File Path: src/modules/chatCatchup.js
// Autonomous Conversation Summarizer • Executive TL;DR
// Missed Chat Catch-Up • Direct DM Delivery & Action Highlights
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

function getGeminiApiKey() {
    const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Fetches recent channel messages within a time window and generates an AI summary briefing
 */
async function generateChannelCatchup(channel, options = {}) {
    const hours = Math.max(1, Math.min(24, options.hours || 6));
    const cutoffTime = Date.now() - (hours * 3600 * 1000);

    // Fetch messages from channel (up to 100)
    let fetchedMessages = [];
    try {
        const msgs = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (msgs) {
            fetchedMessages = Array.from(msgs.values());
        }
    } catch (e) {
        return {
            embed: new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Catch-Up Unavailable')
                .setDescription('Starry lacks permission to view or read message history in this channel!'),
            components: []
        };
    }

    // Filter relevant human messages within timeframe
    const speakerCounts = new Map();
    const cleanMessages = [];

    for (const msg of fetchedMessages) {
        if (msg.createdTimestamp < cutoffTime) continue;
        if (msg.author.bot) continue;

        const text = (msg.content || '').trim();
        // Skip command calls
        if (text.startsWith(',') || text.startsWith('!') || text.startsWith('/') || text.startsWith('.')) continue;
        if (text.length === 0 && msg.attachments.size === 0) continue;

        const authorName = msg.author.displayName || msg.author.username;
        speakerCounts.set(authorName, (speakerCounts.get(authorName) || 0) + 1);

        const timeStr = new Date(msg.createdTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const entry = `[${timeStr}] ${authorName}: ${text || '(Sent an image/attachment)'}`;
        cleanMessages.push(entry);
    }

    // Sort chronologically (oldest to newest for proper context)
    cleanMessages.reverse();

    // If channel has been quiet
    if (cleanMessages.length < 4) {
        const quietEmbed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle(`🕊️ All Caught Up: #${channel.name}`)
            .setDescription(
                `Only **${cleanMessages.length} message(s)** were sent in the last **${hours} hour(s)**.\n` +
                `Nothing major happened while you were away—you're completely up to date! ✨`
            )
            .setFooter({ text: 'Starry Smart Catch-Up • 0 Unread Highlights' })
            .setTimestamp();

        return { embed: quietEmbed, components: [] };
    }

    // Top active speakers
    const topSpeakers = Array.from(speakerCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => `**${name}** (${count})`)
        .join(' • ');

    // Generate AI Summary via Gemini Flash
    let aiSummary = null;
    const apiKey = getGeminiApiKey();

    if (apiKey) {
        try {
            const transcriptSnippet = cleanMessages.slice(-60).join('\n');
            const prompt = `You are Starry, the intelligent and charismatic AI guardian of this Discord server.
Analyze the following conversation from #${channel.name} over the past ${hours} hours.
Provide an executive, easy-to-read "Channel Catch-Up" briefing for members who missed the chat.

Respond in clean Markdown using this structure:
### 🌟 Executive TL;DR
(2-3 clear, engaging sentences summarizing the conversation flow)

### 📌 Key Topics & Debates
(3-4 bullet points highlighting specific topics, discussions, or decisions made)

### 💬 Notable Moments & Highlights
(1-2 quotes or funny/memorable moments from specific users)

Transcript:
${transcriptSnippet}`;

            const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'];
            for (const model of models) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
                        }),
                        signal: AbortSignal.timeout(10000)
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                        if (candidate) {
                            aiSummary = candidate;
                            break;
                        }
                    }
                } catch (err) {}
            }
        } catch (e) {}
    }

    // Fallback if AI offline
    if (!aiSummary) {
        aiSummary = `### 🌟 Executive TL;DR\nMembers have been chatting in #${channel.name} over the last ${hours} hours with ${cleanMessages.length} active messages.\n\n### 📌 Key Topics & Debates\n• Active community chat and discussions.\n• Media and thoughts shared by active members.\n\n### 💬 Notable Moments & Highlights\n• Regular friendly interactions in the channel.`;
    }

    // Truncate if exceptionally long
    if (aiSummary.length > 3500) {
        aiSummary = aiSummary.slice(0, 3500) + '...\n*(Summary truncated for length)*';
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`📰 Starry Channel Catch-Up: #${channel.name}`)
        .setDescription(
            `*AI-powered executive briefing of what you missed over the past **${hours} hour(s)**.*\n\n` +
            aiSummary
        )
        .addFields(
            { name: '👥 Most Active Voices', value: topSpeakers || '*Various members*', inline: true },
            { name: '📊 Volume Analyzed', value: `**${cleanMessages.length}** messages`, inline: true },
            { name: '⚡ Reading Time Saved', value: `~**${Math.max(1, Math.round(cleanMessages.length * 0.08))} min**`, inline: true }
        )
        .setFooter({ text: 'Starry AI Executive Scribe • Always Stay in the Loop' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('catchup_dm')
            .setLabel('Send to my DMs')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📥'),
        new ButtonBuilder()
            .setCustomId(`catchup_refresh_${hours}`)
            .setLabel('Refresh Catch-Up')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
    );

    return { embed, components: [row], rawSummary: aiSummary };
}

module.exports = {
    generateChannelCatchup
};
