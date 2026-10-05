const { PermissionsBitField, SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const mongoose = require('mongoose');

// 🗄️ MONGODB SCHEMA (With High Scores & Settings)
const CountSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    currentNumber: { type: Number, default: 1 },
    highScore: { type: Number, default: 0 },
    lastUser: { type: String, default: null }
});

const CountGuild = mongoose.models.CountGuild || mongoose.model('CountGuild', CountSchema);

// Slash Command Payload for Global Registration
const countSetupPayload = new SlashCommandBuilder()
    .setName('setupcount')
    .setDescription('🔢 Configure the server counting game channel.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The text channel where members will count')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    )
    .toJSON();

const countStatsPayload = new SlashCommandBuilder()
    .setName('countstats')
    .setDescription('📊 View the current counting game statistics and high score.')
    .toJSON();

module.exports = (client) => {
    const config = require('../config');
    const db = require('../utils/database');
    const PREFIX = config.DEFAULT_PREFIX || ',';
    const countCache = new Map();
    const isDbConnected = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);

    // 1. Instantly populate cache from local persistent storage (zero network delay)
    try {
        const localConfigs = db.getAllCountingConfigs ? db.getAllCountingConfigs() : {};
        for (const [gid, cfg] of Object.entries(localConfigs)) {
            if (cfg && cfg.channelId) {
                countCache.set(gid, {
                    channelId: cfg.channelId,
                    currentNumber: cfg.currentNumber || 1,
                    highScore: cfg.highScore || 0,
                    lastUser: cfg.lastUser || null
                });
            }
        }
    } catch (_) {}

    // 2. Safely synchronize with MongoDB when connected
    async function syncFromMongo() {
        if (!isDbConnected()) return;
        try {
            const data = await CountGuild.find().lean();
            data.forEach(g => {
                const entry = {
                    channelId: g.channelId,
                    currentNumber: g.currentNumber || 1,
                    highScore: g.highScore || 0,
                    lastUser: g.lastUser || null
                };
                countCache.set(g.guildId, entry);
                if (db.setCountingConfig) db.setCountingConfig(g.guildId, entry);
            });
            console.log('✅ Counting Game Module Synchronized with MongoDB Cloud');
        } catch (_) {}
    }

    if (isDbConnected()) {
        syncFromMongo();
    }
    mongoose.connection.on('open', syncFromMongo);
    mongoose.connection.on('reconnected', syncFromMongo);

    // ==========================================
    // 1. SLASH COMMAND ROUTER (/setupcount & /countstats)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'setupcount') {
            const channel = interaction.options.getChannel('channel');
            const existing = countCache.get(interaction.guild.id) || (db.getCountingConfig ? db.getCountingConfig(interaction.guild.id) : null);
            const highScore = existing ? existing.highScore : 0;
            const newData = { channelId: channel.id, currentNumber: 1, highScore: highScore, lastUser: null };

            countCache.set(interaction.guild.id, newData);
            if (db.setCountingConfig) db.setCountingConfig(interaction.guild.id, newData);
            if (isDbConnected()) {
                CountGuild.findOneAndUpdate({ guildId: interaction.guild.id }, newData, { upsert: true }).catch(() => {});
            }

            await interaction.reply({ content: `✅ <#${channel.id}> is now configured as the Counting Game channel! Start by typing \`1\`.`, ephemeral: true }).catch(() => {});
            await channel.send('🔢 **Counting Game Started!** The next number is **1**.');
        }

        if (interaction.commandName === 'countstats') {
            const guildData = countCache.get(interaction.guild.id) || (db.getCountingConfig ? db.getCountingConfig(interaction.guild.id) : null);
            if (!guildData) {
                return interaction.reply({ content: '❌ The counting game has not been set up in this server yet! Use `/setupcount`.', ephemeral: true }).catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📊 Counting Game Statistics')
                .addFields(
                    { name: '🔢 Current Number', value: `\`${guildData.currentNumber}\``, inline: true },
                    { name: '🏆 Server High Score', value: `\`${guildData.highScore}\``, inline: true },
                    { name: '💬 Counting Channel', value: `<#${guildData.channelId}>`, inline: false }
                )
                .setFooter({ text: 'Starry Counting Engine • Keep the streak alive!' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] }).catch(() => {});
        }
    });

    // ==========================================
    // 2. MESSAGE LISTENER & ADVANCED GAME ENGINE
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        // Prefix Command (setupcount #channel)
        const { getGuildPrefix } = require('./commandHandler');
        const activePrefix = await getGuildPrefix(message.guild.id);
        const isSetupCmd = Boolean(activePrefix && message.content.toLowerCase().startsWith(activePrefix.toLowerCase() + 'setupcount'));
        if (isSetupCmd) {
            if (!config.isBotOwner(message.author.id, client)) return;
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

            const channel = message.mentions.channels.first() || message.channel;
            const existing = countCache.get(message.guild.id) || (db.getCountingConfig ? db.getCountingConfig(message.guild.id) : null);
            const highScore = existing ? existing.highScore : 0;
            const newData = { channelId: channel.id, currentNumber: 1, highScore: highScore, lastUser: null };

            countCache.set(message.guild.id, newData);
            if (db.setCountingConfig) db.setCountingConfig(message.guild.id, newData);
            if (isDbConnected()) {
                await CountGuild.findOneAndUpdate({ guildId: message.guild.id }, newData, { upsert: true }).catch(() => {});
            }

            await message.reply(`✅ <#${channel.id}> is now the Counting Game channel! Start by typing \`1\`.`).catch(() => {});

            if (channel.id !== message.channel.id) {
                await channel.send('🔢 **Counting Game Started!** The next number is **1**.');
            }
            return;
        }

        const guildData = countCache.get(message.guild.id) || (db.getCountingConfig ? db.getCountingConfig(message.guild.id) : null);
        if (!guildData || message.channel.id !== guildData.channelId) return;
        if (message.content.startsWith(PREFIX) || message.content.startsWith('/')) return;

        const expectedNumber = guildData.currentNumber;
        const msgText = message.content.trim();

        // 🧠 Smart Math Solver Support (e.g., users can type "5+5" for 10)
        let typedNumber = NaN;
        try {
            if (/^[\d+\-*/().\s]+$/.test(msgText)) {
                typedNumber = Math.floor(eval(msgText));
            }
        } catch (e) {
            typedNumber = NaN;
        }

        if (isNaN(typedNumber)) {
            return message.delete().catch(() => {});
        }

        if (typedNumber === expectedNumber && message.author.id !== guildData.lastUser) {
            // ✅ CORRECT NUMBER
            message.react('✅').catch(() => {});

            guildData.currentNumber++;
            guildData.lastUser = message.author.id;

            // Check & Update High Score
            if (guildData.currentNumber - 1 > guildData.highScore) {
                guildData.highScore = guildData.currentNumber - 1;
                if (guildData.highScore % 25 === 0 && guildData.highScore > 0) {
                    message.channel.send(`🎉 **New Milestone Reached!** This server has hit a counting streak of **${guildData.highScore}**! 🚀`).catch(() => {});
                }
            }

            countCache.set(message.guild.id, guildData);
            if (db.setCountingConfig) db.setCountingConfig(message.guild.id, guildData);

            // Background DB Sync
            if (isDbConnected()) {
                CountGuild.updateOne(
                    { guildId: message.guild.id }, 
                    { currentNumber: guildData.currentNumber, highScore: guildData.highScore, lastUser: guildData.lastUser }
                ).catch(() => {});
            }

        } else {
            // ❌ WRONG NUMBER OR SAME USER TWICE
            message.react('❌').catch(() => {});

            const reason = message.author.id === guildData.lastUser 
                ? "You can't count two numbers in a row!" 
                : `You ruined the streak! The next number was supposed to be **${expectedNumber}**!`;

            const previousScore = guildData.currentNumber - 1;

            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🚨 STREAK RUINED!')
                .setDescription(`Ruined by <@${message.author.id}>\n**Reason:** ${reason}\n\n📉 **Streak Reached:** \`${previousScore}\`\n🏆 **Personal Best (High Score):** \`${guildData.highScore}\``)
                .setFooter({ text: 'The count has been reset to 1. Start again!' })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
            setTimeout(() => message.delete().catch(() => {}), 2000);

            // Reset Streak in Memory & DB
            guildData.currentNumber = 1;
            guildData.lastUser = null;
            countCache.set(message.guild.id, guildData);
            if (db.setCountingConfig) db.setCountingConfig(message.guild.id, guildData);

            if (isDbConnected()) {
                CountGuild.updateOne(
                    { guildId: message.guild.id }, 
                    { currentNumber: 1, lastUser: null }
                ).catch(() => {});
            }
        }
    });
};

module.exports.countSlashCommands = [countSetupPayload, countStatsPayload];
