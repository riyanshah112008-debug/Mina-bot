// ==========================================
// 🌌 STARRY AI CHAT SPARK & TOPIC WEAVER
// File Path: src/modules/chatSpark.js
// Context-Aware Dead Chat Reviver • Interactive Voting Pills • XP & Credit Rewards
// ==========================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose');

// In-Memory Active Poll Cache: messageId -> { question, options: [{ id, label, votes: Set(userIds) }] }
const activeSparks = new Map();

function getGeminiApiKey() {
    const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Reads recent channel context and generates an intelligent conversation spark
 */
async function createChatSpark(channel, requester = null) {
    let recentContext = [];
    try {
        const msgs = await channel.messages.fetch({ limit: 12 }).catch(() => null);
        if (msgs) {
            msgs.forEach(m => {
                if (!m.author.bot && m.content && m.content.length > 3) {
                    recentContext.push(`${m.author.username}: ${m.content.slice(0, 100)}`);
                }
            });
        }
    } catch (e) {}

    const apiKey = getGeminiApiKey();
    let sparkData = null;

    if (apiKey) {
        try {
            const prompt = `You are Starry, the witty and engaging AI Discord mascot.
A chat channel needs an exciting, fun, organic conversation spark to get members talking.
Recent channel chat history:
${recentContext.length > 0 ? recentContext.reverse().join('\n') : 'No recent chat - dead chat.'}

Craft a highly entertaining, thought-provoking dilemma, debate, or question relevant to the community (gaming, anime, life choices, or funny hypothetical).
Provide exactly 2 or 3 distinct answer options.

Respond strictly in JSON format without markdown code fences:
{
  "title": "Short catchy title with emojis",
  "question": "The intriguing dilemma or debate question",
  "optionA": "First choice (max 40 chars)",
  "optionB": "Second choice (max 40 chars)",
  "optionC": "Optional third choice (max 40 chars) or null"
}`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, responseMimeType: 'application/json' }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawText) {
                    sparkData = JSON.parse(rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim());
                }
            }
        } catch (e) {}
    }

    if (!sparkData) {
        // Fallback dynamic sparks
        const fallbackSparks = [
            {
                title: '⚡ Cosmic Dilemma',
                question: 'If you could instantly master one superpower for life, which would you pick?',
                optionA: '⏳ Time Travel (Undo any mistake)',
                optionB: '🌌 Teleportation (Instantly be anywhere)',
                optionC: '🧠 Mind Reading (Hear thoughts)'
            },
            {
                title: '🎮 Ultimate Showdown',
                question: 'You are stranded on an isolated island for 1 year with unlimited food. You can only bring ONE gaming device:',
                optionA: '💻 Ultimate Gaming PC',
                optionB: '🎮 PS5 / Nintendo Switch',
                optionC: '📱 Smartphone + 5G'
            },
            {
                title: '🍜 Late Night Debate',
                question: 'Which meal is objectively the superior comfort food of all time?',
                optionA: '🍕 Late Night Pizza & Wings',
                optionB: '🍜 Steaming Ramen & Gyozas',
                optionC: '🍔 Juicy Gourmet Smashburger'
            }
        ];
        sparkData = fallbackSparks[Math.floor(Math.random() * fallbackSparks.length)];
    }

    const embed = new EmbedBuilder()
        .setColor('#FF79C6')
        .setTitle(`✨ ${sparkData.title}`)
        .setDescription(
            `### ${sparkData.question}\n\n` +
            `*Vote below to lock in your answer and spark the debate! Participating awards **+25 XP** & **+$50 Credits**!* 🎁`
        )
        .setFooter({ text: requester ? `Sparked by ${requester.username} • Starry Topic Weaver` : 'Starry Autonomous Chat Weaver' })
        .setTimestamp();

    const buttons = [
        new ButtonBuilder()
            .setCustomId('spark_vote_A')
            .setLabel(sparkData.optionA.slice(0, 80))
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('spark_vote_B')
            .setLabel(sparkData.optionB.slice(0, 80))
            .setStyle(ButtonStyle.Secondary)
    ];

    if (sparkData.optionC) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('spark_vote_C')
                .setLabel(sparkData.optionC.slice(0, 80))
                .setStyle(ButtonStyle.Success)
        );
    }

    const row = new ActionRowBuilder().addComponents(buttons);

    return { embed, row, sparkData };
}

// Handle Spark Vote Button Clicks
async function handleSparkVote(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('spark_vote_')) return false;

    const voteChoice = customId.replace('spark_vote_', ''); // 'A', 'B', 'C'
    const messageId = interaction.message.id;

    if (!activeSparks.has(messageId)) {
        activeSparks.set(messageId, {
            A: new Set(),
            B: new Set(),
            C: new Set()
        });
    }

    const poll = activeSparks.get(messageId);
    const userId = interaction.user.id;

    // Check if user already voted for this choice
    if (poll[voteChoice].has(userId)) {
        return interaction.reply({ content: 'ℹ️ You already voted for this option!', ephemeral: true });
    }

    // Remove previous vote from other choices
    ['A', 'B', 'C'].forEach(c => poll[c]?.delete(userId));
    poll[voteChoice].add(userId);

    const totalVotes = poll.A.size + poll.B.size + poll.C.size;
    const pctA = Math.round((poll.A.size / totalVotes) * 100) || 0;
    const pctB = Math.round((poll.B.size / totalVotes) * 100) || 0;
    const pctC = Math.round((poll.C.size / totalVotes) * 100) || 0;

    // Award XP & Credits
    try {
        const EcoUser = mongoose.models.EcoUser;
        if (EcoUser) {
            await EcoUser.updateOne(
                { userId: interaction.user.id },
                { $inc: { balance: 50, xp: 25 } },
                { upsert: true }
            ).catch(() => {});
        }
    } catch (e) {}

    // Update message components with live percentages
    const oldRow = interaction.message.components[0];
    if (oldRow) {
        const newComponents = oldRow.components.map(comp => {
            const btn = ButtonBuilder.from(comp);
            if (comp.customId === 'spark_vote_A') {
                const baseLabel = comp.label.replace(/\s\(\d+%\)$/, '');
                btn.setLabel(`${baseLabel} (${pctA}%)`);
            } else if (comp.customId === 'spark_vote_B') {
                const baseLabel = comp.label.replace(/\s\(\d+%\)$/, '');
                btn.setLabel(`${baseLabel} (${pctB}%)`);
            } else if (comp.customId === 'spark_vote_C') {
                const baseLabel = comp.label.replace(/\s\(\d+%\)$/, '');
                btn.setLabel(`${baseLabel} (${pctC}%)`);
            }
            return btn;
        });

        const newRow = new ActionRowBuilder().addComponents(newComponents);
        await interaction.message.edit({ components: [newRow] }).catch(() => {});
    }

    return interaction.reply({
        content: `🎉 You voted! Registered **${totalVotes} total votes**! Earned **+25 XP** & **+$50 Credits**! 💫`,
        ephemeral: true
    });
}

module.exports = {
    createChatSpark,
    handleSparkVote
};
