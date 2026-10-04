// ==========================================
// 🧠 STARRY MASTER SETUP TEXT & SYNC ENGINE
// File Path: src/modules/masterSetupText.js
// Multilingual Setup Wizard • 14 Global Languages • Neural Server Layout Linker
// ==========================================

const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { getGuildLanguage, setGuildLanguage, t, createSetupPromptCard, SUPPORTED_LANGUAGES, getWelcomeDefaults } = require('../utils/i18n');

// Safely load databases
let ServerSettings, ChestChannel, BoostChannel;
try { ServerSettings = require('../models/ServerSettings'); } catch(e) {}
try { ChestChannel = require('../models/ChestChannel'); } catch(e) {}
try { BoostChannel = require('../models/BoostChannel'); } catch(e) {}

/**
 * Executes the core server channel and layout scan, mapping internal subsystems
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {string} lang
 * @returns {Promise<string[]>}
 */
async function runServerSync(guild, client, lang = 'en') {
    const channels = guild.channels.cache;
    let report = [];

    // --- 1. BASIC CONFIGURATION ---
    if (ServerSettings) {
        await ServerSettings.findOneAndUpdate({ guildId: guild.id }, { triggerWord: 'Starry' }, { upsert: true });
        report.push(t(lang, 'setup.report.identity', { name: 'Starry' }));
    }

    // --- 2. COMMUNITY FEATURES ---
    const welcomeChan = channels.find(c => c.name.includes('welcome'));
    if (welcomeChan) {
        try {
            const WelcomeSettings = require('../models/WelcomeSettings');
            const defs = getWelcomeDefaults(lang, guild.name);
            await WelcomeSettings.findOneAndUpdate(
                { guildId: guild.id },
                {
                    channelId: welcomeChan.id,
                    title: defs.title,
                    description: defs.description,
                    pingContent: defs.pingContent,
                    footer: defs.footer
                },
                { upsert: true, new: true }
            );
        } catch (e) {}
        report.push(t(lang, 'setup.report.welcome', { channel: welcomeChan.id }));
    }

    const goodbyeChan = channels.find(c => c.name.includes('goodbye') || c.name.includes('leave') || c.name.includes('farewell'));
    if (goodbyeChan) {
        try {
            const { GoodbyeSettings } = require('./goodbye');
            if (GoodbyeSettings) {
                await GoodbyeSettings.findOneAndUpdate(
                    { guildId: guild.id },
                    { channelId: goodbyeChan.id },
                    { upsert: true, new: true }
                );
            }
        } catch (e) {}
        report.push(t(lang, 'setup.report.goodbye', { channel: goodbyeChan.id }));
    }
    
    const starboardChan = channels.find(c => c.name.includes('starboard'));
    if (starboardChan) report.push(t(lang, 'setup.report.starboard', { channel: starboardChan.id }));
    
    const suggestChan = channels.find(c => c.name.includes('suggestions') || c.name.includes('ideas'));
    if (suggestChan) report.push(t(lang, 'setup.report.suggestions', { channel: suggestChan.id }));

    // --- 3. SECURITY & LOGS ---
    const verifyChan = channels.find(c => c.name.includes('verification') || c.name.includes('verify'));
    if (verifyChan) report.push(t(lang, 'setup.report.verify', { channel: verifyChan.id }));
    
    const logChannels = channels.filter(c => c.name.includes('logs-'));
    if (logChannels.size > 0) report.push(t(lang, 'setup.report.logging', { count: logChannels.size }));

    // --- 4. TICKETS & APPS ---
    const openTicketsCat = channels.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('opened tickets'));
    const closedTicketsCat = channels.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('closed tickets'));
    if (openTicketsCat && closedTicketsCat) {
        report.push(t(lang, 'setup.report.tickets', { open: openTicketsCat.name, closed: closedTicketsCat.name }));
    }
    
    const applicationsCat = channels.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('applications'));
    if (applicationsCat) {
        report.push(t(lang, 'setup.report.apps', { category: applicationsCat.name }));
    }

    // --- 5. ECONOMY & BOOSTS ---
    const booster = channels.find(c => c.name.includes('boosters') || c.name.includes('boost'));
    if (booster && BoostChannel) {
        await BoostChannel.findOneAndUpdate({ guildId: guild.id }, { channelId: booster.id }, { upsert: true });
        report.push(t(lang, 'setup.report.boost', { channel: booster.id }));
    }

    const chestTargets = channels.filter(c => c.type === ChannelType.GuildText && (c.name.includes('general') || c.name.includes('cafe-chat') || c.name.includes('international') || c.name.includes('spam')));
    if (ChestChannel) {
        if (!client.chestChannelsCache) client.chestChannelsCache = new Set();
        let chestCount = 0;
        for (const [id, channel] of chestTargets) {
            const existing = await ChestChannel.findOne({ channelId: id });
            if (!existing) {
                await ChestChannel.create({ guildId: guild.id, channelId: id });
                client.chestChannelsCache.add(id);
                chestCount++;
            }
        }
        if (chestCount > 0) report.push(t(lang, 'setup.report.loot', { count: chestCount }));
    }

    return report;
}

module.exports = (client) => {
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        const raw = message.content.trim().toLowerCase();
        const isSetupTrigger = (raw === '.setup-starry' || raw === ',setup-starry' || raw === ',setup server' || raw === '.setup');
        if (!isSetupTrigger) return;

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const currentLang = await getGuildLanguage(message.guild.id);
            return message.reply(t(currentLang, 'common.access_denied'));
        }

        let currentLang = await getGuildLanguage(message.guild.id);
        const card = createSetupPromptCard(message.guild, currentLang, client.user);
        const response = await message.reply(card);

        const filter = i => i.user.id === message.author.id;
        const collector = response.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async i => {
            try {
                // A. Language Dropdown Selection
                if (i.isStringSelectMenu() && (i.customId === 'starry_setup_lang_select' || i.customId === 'starry_lang_select')) {
                    const newLangCode = i.values[0];
                    await setGuildLanguage(message.guild.id, newLangCode);
                    currentLang = newLangCode;

                    const updatedCard = createSetupPromptCard(message.guild, currentLang, client.user);
                    return await i.update(updatedCard);
                }

                // B. Cancel Button
                if (i.customId === 'master_txt_cancel') {
                    collector.stop('cancelled');
                    return await i.update({
                        content: t(currentLang, 'setup.aborted'),
                        embeds: [],
                        components: []
                    });
                }

                // C. Confirm & Sync Button
                if (i.customId === 'master_txt_confirm') {
                    collector.stop('synced');
                    await i.update({
                        content: t(currentLang, 'setup.scanning'),
                        embeds: [],
                        components: []
                    });

                    const report = await runServerSync(message.guild, client, currentLang);
                    const langInfo = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES['en'];

                    const successEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle(t(currentLang, 'setup.complete_title'))
                        .setDescription(
                            `${t(currentLang, 'setup.complete_desc')}\n\n` +
                            `🌐 **Language:** ${langInfo.flag} **${langInfo.native}**\n\n` +
                            `${report.join('\n')}`
                        )
                        .setFooter({ text: 'Starry Master Brain • Language: ' + langInfo.name, iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();

                    return await message.channel.send({ embeds: [successEmbed] });
                }
            } catch (err) {
                console.error('[masterSetupText] Collector error:', err);
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await response.edit({
                    content: t(currentLang, 'setup.timeout'),
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });
    });
};

module.exports.runServerSync = runServerSync;
