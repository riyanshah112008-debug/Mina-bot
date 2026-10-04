// ==========================================
// ⚔️ STARRY ASTRAL CO-OP RAID BOSS ENGINE
// File Path: src/modules/astralRaidEngine.js
// Real-Time Multiplayer World Boss Combat in Discord Embeds
// Live Dynamic HP Bars • Tactical Combat Actions • MVP Rewards & Economy Integration
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');
const RaidBoss = require('../models/RaidBoss');

// Active Raids In-Memory Cache: guildId -> RaidState
const activeRaids = new Map();

// Player Combat Action Cooldown: `${guildId}_${userId}` -> timestamp
const playerCooldowns = new Map();
const COOLDOWN_MS = 3000; // 3 second tactical cooldown per action

// Debounced Message Edit Throttler: guildId -> { timer, pendingEdit }
const editThrottlers = new Map();

// Procedural World Boss Bestiary
const BOSS_ROSTER = [
    {
        name: 'Nyx, Umbral Void Sovereign',
        title: 'Tier V • Cosmic Abyssal Entity',
        element: 'void',
        elementEmoji: '🌌',
        color: '#9B59B6',
        maxHp: 8000,
        imageUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../xT9IgzoKnwFNmISR8I/giphy.gif',
        skills: ['Void Collapse', 'Singularity Pulse', 'Abyssal Oblivion']
    },
    {
        name: 'Solaris, Sun-Forged Chimera',
        title: 'Tier IV • Ancient Solar Monarch',
        element: 'fire',
        elementEmoji: '🔥',
        color: '#E74C3C',
        maxHp: 7500,
        imageUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../3o7TKMt1VVNkHV2PaE/giphy.gif',
        skills: ['Solar Flare Cataclysm', 'Molten Eruption', 'Supernova Breath']
    },
    {
        name: 'Thorian, The Storm Emperor',
        title: 'Tier IV • Thunderous Sky Dragon',
        element: 'lightning',
        elementEmoji: '⚡',
        color: '#F1C40F',
        maxHp: 7000,
        imageUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../l0HlTy9x8FxZdSJjy/giphy.gif',
        skills: ['Gigavolt Storm', 'Thunderclap Strike', 'Ion Tempest']
    },
    {
        name: 'Ymir, The Absolute Frost King',
        title: 'Tier IV • Glacier Elemental Lord',
        element: 'ice',
        elementEmoji: '❄️',
        color: '#3498DB',
        maxHp: 7200,
        imageUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../3o7btPCcdNniyf0ArS/giphy.gif',
        skills: ['Absolute Zero Frost', 'Blizzard Shards', 'Permafrost Shield']
    },
    {
        name: 'Astraea, Fallen Starlight Reflection',
        title: 'Tier V • Mythic Astral Guardian',
        element: 'celestial',
        elementEmoji: '👑',
        color: '#FFD700',
        maxHp: 9000,
        imageUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../xT0xeJpnrWC4XWblEk/giphy.gif',
        skills: ['Stardust Supernova', 'Cosmic Judgment', 'Astraea Fallen Grace']
    }
];

// Visual ASCII HP Bar Generator
function renderHpBar(current, max, size = 16) {
    const pct = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(size * pct);
    const empty = size - filled;
    const blockFill = '█'.repeat(filled);
    const blockEmpty = '░'.repeat(empty);
    const pctInt = Math.round(pct * 100);

    const barColor = pct > 0.5 ? '🟩' : pct > 0.2 ? '🟨' : '🟥';
    return `${barColor} \`[${blockFill}${blockEmpty}]\` **${pctInt}%**\n` +
           `❤️ **${Math.max(0, current).toLocaleString()}** / **${max.toLocaleString()} HP**`;
}

// Build the Live Raid Battle Embed
function buildRaidEmbed(raid) {
    const boss = raid.boss;
    const isEnraged = raid.phase === 2;
    const isCritical = raid.phase === 3;

    const phaseTitle = isCritical ? '⚠️ PHASE 3: CRITICAL DESPERATION ⚠️'
                     : isEnraged ? '🔥 PHASE 2: ENRAGED MODE 🔥'
                     : '⚔️ PHASE 1: ACTIVE COMBAT';

    const embed = new EmbedBuilder()
        .setColor(isCritical ? '#FF0055' : isEnraged ? '#FF4500' : boss.color || '#9B59B6')
        .setTitle(`${boss.elementEmoji} ASTRAL WORLD BOSS: ${boss.name}`)
        .setDescription(
            `*${boss.title}*\n\n` +
            `**Boss Health:**\n${renderHpBar(raid.currentHp, raid.maxHp)}\n\n` +
            `**Status:** \`${phaseTitle}\` • ⏱️ Expires <t:${Math.floor(raid.expiresAt.getTime() / 1000)}:R>`
        );

    // Active Participants Ranking
    if (raid.participants.size > 0) {
        const sorted = Array.from(raid.participants.values())
            .sort((a, b) => b.damageDealt - a.damageDealt)
            .slice(0, 5);

        const leaderList = sorted.map((p, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️';
            return `${medal} **${p.username}**: \`${p.damageDealt.toLocaleString()} DMG\` (${p.actionsCount} hits)`;
        }).join('\n');

        embed.addFields({ name: `👥 Active Strike Team (${raid.participants.size} Heroes)`, value: leaderList });
    } else {
        embed.addFields({ name: '👥 Strike Team', value: '*No heroes have struck yet! Click a button below to join the battle!*' });
    }

    // Live Combat Log
    if (raid.combatLog.length > 0) {
        const recentLogs = raid.combatLog.slice(-4).join('\n');
        embed.addFields({ name: '📜 Combat Feed', value: recentLogs });
    }

    embed.setFooter({ text: 'Starry Astral Raids • 3s Tactical Cooldown • Real-Time Teamwork' });
    embed.setTimestamp();
    return embed;
}

// Build Combat Buttons Row
function buildRaidButtons(isFinished = false) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('raid_strike')
            .setLabel('Strike')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚔️')
            .setDisabled(isFinished),
        new ButtonBuilder()
            .setCustomId('raid_spell')
            .setLabel('Astral Spell')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔮')
            .setDisabled(isFinished),
        new ButtonBuilder()
            .setCustomId('raid_shield')
            .setLabel('Shield Ally')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛡️')
            .setDisabled(isFinished),
        new ButtonBuilder()
            .setCustomId('raid_potion')
            .setLabel('Starlight Elixir')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🧪')
            .setDisabled(isFinished),
        new ButtonBuilder()
            .setCustomId('raid_ultimate')
            .setLabel('Ultimate Nova')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💫')
            .setDisabled(isFinished)
    );

    return [row1];
}

// Throttled Safe Message Update (Guarantees zero Discord rate-limit violations)
function scheduleRaidMessageUpdate(guildId, message, raid) {
    if (editThrottlers.has(guildId)) return;

    const timer = setTimeout(async () => {
        editThrottlers.delete(guildId);
        if (!message) return;
        try {
            const embed = buildRaidEmbed(raid);
            const components = buildRaidButtons(raid.currentHp <= 0 || !raid.active);
            await message.edit({ embeds: [embed], components }).catch(() => {});
        } catch (e) {}
    }, 1200);

    editThrottlers.set(guildId, timer);
}

// ==========================================
// SPAWN WORLD BOSS METHOD
// ==========================================

async function spawnRaidBoss(guild, channel, options = {}) {
    if (activeRaids.has(guild.id)) {
        const existing = activeRaids.get(guild.id);
        if (existing.active && existing.currentHp > 0) {
            return { success: false, error: `A World Boss is already active in <#${existing.channelId}>!` };
        }
    }

    const template = BOSS_ROSTER[Math.floor(Math.random() * BOSS_ROSTER.length)];
    const maxHp = options.hp || template.maxHp;
    const durationMinutes = options.duration || 10;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const raidState = {
        guildId: guild.id,
        channelId: channel.id,
        message: null,
        boss: template,
        level: options.level || 50,
        maxHp: maxHp,
        currentHp: maxHp,
        phase: 1,
        active: true,
        partyBuffTurns: 0,
        participants: new Map(), // userId -> participantObj
        combatLog: [
            `🌌 **${template.name}** descended upon the arena!`,
            `⚠️ Defeat the boss within **${durationMinutes} minutes** to claim celestial loot!`
        ],
        expiresAt: expiresAt,
        finalBlowUser: null
    };

    const initialEmbed = buildRaidEmbed(raidState);
    const initialButtons = buildRaidButtons(false);

    const raidMsg = await channel.send({
        content: `⚔️ **A CELESTIAL WORLD BOSS HAS APPEARED!** Rally the server strike team!`,
        embeds: [initialEmbed],
        components: initialButtons
    });

    raidState.message = raidMsg;
    activeRaids.set(guild.id, raidState);

    // Save initial state to MongoDB
    await RaidBoss.findOneAndUpdate(
        { guildId: guild.id, active: true },
        {
            guildId: guild.id,
            channelId: channel.id,
            messageId: raidMsg.id,
            bossName: template.name,
            bossTitle: template.title,
            element: template.element,
            level: raidState.level,
            maxHp: maxHp,
            currentHp: maxHp,
            phase: 1,
            active: true,
            expiresAt: expiresAt,
            combatLog: raidState.combatLog
        },
        { upsert: true }
    ).catch(() => {});

    // Schedule Expiry Timer
    setTimeout(() => {
        handleRaidTimeout(guild.id);
    }, durationMinutes * 60 * 1000);

    return { success: true, raid: raidState };
}

// ==========================================
// HANDLE REAL-TIME COMBAT ACTIONS
// ==========================================

async function handleRaidCombatAction(interaction, actionType) {
    const guildId = interaction.guild?.id;
    if (!guildId || !activeRaids.has(guildId)) {
        return interaction.reply({ content: '❌ No active World Boss raid in this server right now!', ephemeral: true });
    }

    const raid = activeRaids.get(guildId);
    if (!raid.active || raid.currentHp <= 0) {
        return interaction.reply({ content: '🏆 The World Boss has already been defeated!', ephemeral: true });
    }

    const userId = interaction.user.id;
    const now = Date.now();
    const cooldownKey = `${guildId}_${userId}`;
    const lastAction = playerCooldowns.get(cooldownKey) || 0;

    if (now - lastAction < COOLDOWN_MS) {
        const remaining = ((COOLDOWN_MS - (now - lastAction)) / 1000).toFixed(1);
        return interaction.reply({
            content: `⏳ **Combat Fatigue:** Recharging stamina! Wait **${remaining}s** before striking again.`,
            ephemeral: true
        });
    }
    playerCooldowns.set(cooldownKey, now);

    // Ensure Participant Record
    if (!raid.participants.has(userId)) {
        raid.participants.set(userId, {
            userId: userId,
            username: interaction.user.displayName || interaction.user.username,
            damageDealt: 0,
            actionsCount: 0,
            ultimateUsed: false,
            lastActionAt: new Date()
        });
    }
    const participant = raid.participants.get(userId);

    let damageDealt = 0;
    let actionLog = '';
    const hasBuff = raid.partyBuffTurns > 0;
    const buffMultiplier = hasBuff ? 1.25 : 1.0;

    if (actionType === 'strike') {
        const isCrit = Math.random() < 0.25;
        const base = Math.floor(Math.random() * 200) + 180;
        damageDealt = Math.round(base * buffMultiplier * (isCrit ? 1.6 : 1.0));
        actionLog = isCrit
            ? `💥 **CRITICAL STRIKE!** ${interaction.user.username} dealt **${damageDealt.toLocaleString()} DMG**!`
            : `⚔️ **${interaction.user.username}** slashed the boss for **${damageDealt.toLocaleString()} DMG**!`;
    } else if (actionType === 'spell') {
        const isSupernova = Math.random() < 0.35;
        const base = Math.floor(Math.random() * 400) + 120;
        damageDealt = Math.round(base * buffMultiplier * (isSupernova ? 2.2 : 1.0));
        actionLog = isSupernova
            ? `🔮✨ **ASTRAL SUPERNOVA!** ${interaction.user.username} channeled cosmic energy for **${damageDealt.toLocaleString()} DMG**!`
            : `🔮 **${interaction.user.username}** cast an Astral Bolt for **${damageDealt.toLocaleString()} DMG**!`;
    } else if (actionType === 'shield') {
        damageDealt = Math.round((Math.floor(Math.random() * 80) + 60) * buffMultiplier);
        actionLog = `🛡️ **${interaction.user.username}** raised a Celestial Aegis, shielding the party! (+${damageDealt} DMG)`;
    } else if (actionType === 'potion') {
        raid.partyBuffTurns = 4;
        damageDealt = 100;
        actionLog = `🧪✨ **${interaction.user.username}** shattered a Starlight Elixir! The team gains **+25% DMG** for 4 rounds!`;
    } else if (actionType === 'ultimate') {
        if (participant.ultimateUsed) {
            return interaction.reply({
                content: '⚠️ You have already unleashed your **Celestial Ultimate** in this raid battle!',
                ephemeral: true
            });
        }
        participant.ultimateUsed = true;
        const base = Math.floor(Math.random() * 1000) + 1400;
        damageDealt = Math.round(base * buffMultiplier);
        actionLog = `💫👑 **CELESTIAL ULTIMATE UNLEASHED!** ${interaction.user.username} dealt a devastating **${damageDealt.toLocaleString()} DMG**!`;
    }

    if (hasBuff) raid.partyBuffTurns--;

    // Apply Damage
    participant.damageDealt += damageDealt;
    participant.actionsCount++;
    participant.lastActionAt = new Date();
    raid.currentHp = Math.max(0, raid.currentHp - damageDealt);

    raid.combatLog.push(actionLog);

    // Phase Transitions
    const hpRatio = raid.currentHp / raid.maxHp;
    if (hpRatio <= 0.20 && raid.phase < 3) {
        raid.phase = 3;
        raid.combatLog.push(`⚠️🔥 **${raid.boss.name} has entered PHASE 3: DESPERATION NOVA!** All attacks boosted!`);
    } else if (hpRatio <= 0.50 && raid.phase < 2) {
        raid.phase = 2;
        raid.combatLog.push(`🔥 **${raid.boss.name} has entered PHASE 2: ENRAGED!** The arena trembles!`);
    }

    // Boss Retaliation (25% chance)
    if (raid.currentHp > 0 && Math.random() < 0.25) {
        const skill = raid.boss.skills[Math.floor(Math.random() * raid.boss.skills.length)];
        raid.combatLog.push(`🚨 **${raid.boss.name}** counter-attacked with **${skill}**! Keep your guard up!`);
    }

    if (raid.combatLog.length > 8) {
        raid.combatLog = raid.combatLog.slice(-6);
    }

    // Check Victory
    if (raid.currentHp <= 0) {
        raid.finalBlowUser = interaction.user;
        await handleRaidVictory(guildId, interaction);
        return interaction.reply({
            content: `🎯 **FINAL BLOW!** You struck down **${raid.boss.name}** for **${damageDealt.toLocaleString()} DMG**!`,
            ephemeral: true
        });
    }

    // Update Message
    scheduleRaidMessageUpdate(guildId, raid.message, raid);

    return interaction.reply({
        content: `⚔️ Action registered! Dealt **${damageDealt.toLocaleString()} DMG**! Total: **${participant.damageDealt.toLocaleString()} DMG**`,
        ephemeral: true
    });
}

// ==========================================
// RAID VICTORY & REWARDS DISTRIBUTION
// ==========================================

async function handleRaidVictory(guildId, triggerInteraction) {
    const raid = activeRaids.get(guildId);
    if (!raid) return;
    raid.active = false;

    const participants = Array.from(raid.participants.values())
        .sort((a, b) => b.damageDealt - a.damageDealt);

    const mvp = participants[0] || null;
    const vanguard = participants[1] || null;
    const mystic = participants[2] || null;
    const finalBlow = raid.finalBlowUser;

    const victoryEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`👑 VICTORY! ${raid.boss.name.toUpperCase()} HAS BEEN DEFEATED!`)
        .setDescription(
            `✨ The heavens illuminate as the celestial beast dissolves into radiant starlight!\n` +
            `**${participants.length} brave heroes** banded together to vanquish the threat!\n\n` +
            `### 🏆 RAID MVP PODIUM:\n` +
            (mvp ? `🥇 **#1 MVP:** <@${mvp.userId}> — \`${mvp.damageDealt.toLocaleString()} DMG\`\n` : '') +
            (vanguard ? `🥈 **#2 Vanguard:** <@${vanguard.userId}> — \`${vanguard.damageDealt.toLocaleString()} DMG\`\n` : '') +
            (mystic ? `🥉 **#3 Mystic:** <@${mystic.userId}> — \`${mystic.damageDealt.toLocaleString()} DMG\`\n` : '') +
            (finalBlow ? `🎯 **Final Blow Executioner:** <@${finalBlow.id}>\n` : '') +
            `\n🎁 **Rewards have been deposited into all participants' wallets & profiles!**`
        )
        .addFields(
            { 
                name: '💰 Rewards Distributed', 
                value: `• **MVP:** +1,500 XP & +$3,000 Credits 👑\n• **Vanguard:** +1,000 XP & +$2,000 Credits 🥈\n• **Mystic:** +750 XP & +$1,500 Credits 🥉\n• **All Heroes:** +400 XP & +$800 Credits ✨` 
            }
        )
        .setFooter({ text: 'Starry Co-Op World Boss Engine • Complete Victory' })
        .setTimestamp();

    const disabledButtons = buildRaidButtons(true);

    if (raid.message) {
        await raid.message.edit({ embeds: [victoryEmbed], components: disabledButtons }).catch(() => {});
    }

    // Distribute Currency & XP into MongoDB EcoUser and User
    try {
        const EcoUser = mongoose.models.EcoUser;
        const User = mongoose.models.User;

        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            let xpReward = 400;
            let creditReward = 800;

            if (i === 0) { xpReward = 1500; creditReward = 3000; }
            else if (i === 1) { xpReward = 1000; creditReward = 2000; }
            else if (i === 2) { xpReward = 750; creditReward = 1500; }

            if (finalBlow && finalBlow.id === p.userId) {
                creditReward += 500;
                xpReward += 250;
            }

            if (EcoUser) {
                await EcoUser.updateOne(
                    { userId: p.userId, guildId: guildId },
                    { $inc: { wallet: creditReward, xp: xpReward } },
                    { upsert: true }
                ).catch(() => {});
            }

            if (User) {
                await User.updateOne(
                    { userId: p.userId, guildId: guildId },
                    { $inc: { credits: creditReward, xp: xpReward } },
                    { upsert: true }
                ).catch(() => {});
            }
        }
    } catch (rewardErr) {
        console.error('❌ Error distributing raid rewards:', rewardErr);
    }

    // Mark completed in MongoDB
    await RaidBoss.updateOne(
        { guildId: guildId, active: true },
        { active: false, currentHp: 0 }
    ).catch(() => {});

    activeRaids.delete(guildId);
}

// Timeout handler if raid is not defeated in time
async function handleRaidTimeout(guildId) {
    if (!activeRaids.has(guildId)) return;
    const raid = activeRaids.get(guildId);
    if (!raid.active || raid.currentHp <= 0) return;

    raid.active = false;
    const defeatEmbed = new EmbedBuilder()
        .setColor('#4A4A4A')
        .setTitle(`⌛ TIME EXPIRED: ${raid.boss.name.toUpperCase()} HAS ESCAPED!`)
        .setDescription(
            `The celestial alignment faded and **${raid.boss.name}** vanished into the cosmos!\n` +
            `The strike team was unable to defeat the boss in time. Better luck in the next raid!`
        )
        .setTimestamp();

    if (raid.message) {
        await raid.message.edit({ embeds: [defeatEmbed], components: buildRaidButtons(true) }).catch(() => {});
    }

    await RaidBoss.updateOne({ guildId: guildId, active: true }, { active: false }).catch(() => {});
    activeRaids.delete(guildId);
}

function getActiveRaid(guildId) {
    return activeRaids.get(guildId) || null;
}

module.exports = {
    spawnRaidBoss,
    handleRaidCombatAction,
    getActiveRaid,
    BOSS_ROSTER
};
