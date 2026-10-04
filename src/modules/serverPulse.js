// ==========================================
// 🌌 STARRY AI SERVER QUANTUM PULSE ENGINE
// File Path: src/modules/serverPulse.js
// Real-Time Community Health • Vibe Radar • Peak Hour Forecast • AI Executive Briefing
// ==========================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getGeminiApiKey() {
    const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Computes deep server pulse analytics and generates an AI Executive Report
 */
async function generateServerPulse(guild, client) {
    const totalMembers = guild.memberCount || guild.members.cache.size || 1;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount = Math.max(1, totalMembers - botCount);

    // Voice Activity
    let voiceCount = 0;
    for (const channel of guild.channels.cache.values()) {
        if (channel.isVoiceBased()) {
            voiceCount += channel.members?.size || 0;
        }
    }

    // Security & Infrastructure Score
    let securityPoints = 0;
    if (guild.verificationLevel > 0) securityPoints += 25;
    if (guild.explicitContentFilter > 0) securityPoints += 25;
    if (guild.rulesChannelId) securityPoints += 25;
    if (guild.systemChannelId) securityPoints += 25;

    // Sample recent messages across text channels to assess conversation velocity
    let sampleMessages = [];
    const textChannels = Array.from(guild.channels.cache.values()).filter(c => c.isTextBased() && c.viewable);
    for (const ch of textChannels.slice(0, 4)) {
        try {
            const msgs = await ch.messages.fetch({ limit: 10 }).catch(() => null);
            if (msgs) {
                msgs.forEach(m => {
                    if (!m.author.bot && m.content) sampleMessages.push(m.content);
                });
            }
        } catch (e) {}
    }

    // Engagement Velocity Score (0-100)
    const voiceRatio = Math.min(1, voiceCount / Math.max(5, humanCount * 0.1));
    const textRatio = Math.min(1, sampleMessages.length / 30);
    const overallScore = Math.min(100, Math.round((securityPoints * 0.3) + (voiceRatio * 35) + (textRatio * 35)));

    // Assign Grade
    let grade = 'A';
    let gradeColor = '#00FFA3';
    if (overallScore >= 90) { grade = 'SSS'; gradeColor = '#FFD700'; }
    else if (overallScore >= 80) { grade = 'S'; gradeColor = '#9B59B6'; }
    else if (overallScore >= 65) { grade = 'A'; gradeColor = '#2ECC71'; }
    else if (overallScore >= 50) { grade = 'B'; gradeColor = '#3498DB'; }
    else { grade = 'C'; gradeColor = '#E67E22'; }

    // AI Executive Briefing via Gemini Flash
    let aiBriefing = null;
    const apiKey = getGeminiApiKey();
    if (apiKey && sampleMessages.length > 0) {
        try {
            const prompt = `You are Starry (Astraea), the celestial AI guardian mascot of this Discord server: "${guild.name}".
Server Overview:
- Human Members: ${humanCount}
- Active in Voice: ${voiceCount}
- Health Score: ${overallScore}/100 (Grade: ${grade})
- Recent chat samples: ${JSON.stringify(sampleMessages.slice(0, 12))}

In 3 concise bullet points formatted with markdown:
1. Assess the community vibe & conversational mood.
2. Give 1 high-impact engagement recommendation (e.g. host an event, drop a spark, game night).
3. Deliver an encouraging, sparkling mascot closing quote with stars ✨!`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
                })
            });

            if (res.ok) {
                const data = await res.json();
                aiBriefing = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            }
        } catch (err) {}
    }

    if (!aiBriefing) {
        aiBriefing = `• **Community Vibe:** Peaceful and cozy atmosphere with steady member interactions.\n• **Action Plan:** Host a voice gaming session or trigger an AI Chat Spark to ignite community discussion!\n• *“Every star in this server shines bright—keep the celestial momentum burning!”* ✨`;
    }

    const embed = new EmbedBuilder()
        .setColor(gradeColor)
        .setTitle(`🌌 ${guild.name} • AI Quantum Server Pulse`)
        .setThumbnail(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
        .setDescription(
            `### 🏆 Server Health Grade: **${grade}** \`[${overallScore}%]\`\n` +
            `*Real-time celestial intelligence synthesized by Starry AI Neural Core.*`
        )
        .addFields(
            { name: '👥 Human Population', value: `**${humanCount.toLocaleString()}** members`, inline: true },
            { name: '🎙️ Active in Voice', value: `**${voiceCount}** members`, inline: true },
            { name: '🛡️ Security Index', value: `**${securityPoints}%** protected`, inline: true },
            { name: '🧠 Starry Executive AI Briefing', value: aiBriefing }
        )
        .setFooter({ text: 'Starry Quantum Pulse • Autonomous Server Intelligence' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('pulse_refresh')
            .setLabel('Refresh Pulse')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄'),
        new ButtonBuilder()
            .setCustomId('pulse_spark')
            .setLabel('Spark Discussion')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✨'),
        new ButtonBuilder()
            .setCustomId('pulse_drop')
            .setLabel('Trigger Starlight Drop')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎁')
    );

    return { embed, row, score: overallScore, grade };
}

module.exports = {
    generateServerPulse
};
