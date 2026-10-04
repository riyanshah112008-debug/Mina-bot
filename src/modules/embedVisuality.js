// ==========================================
// 🎨 STARRY EMBED VISUALITY STUDIO & MASTER CUSTOMIZER
// File Path: src/modules/embedVisuality.js
// Universal Embed Customization Suite for All Bot Features
// Welcome • Goodbye • Leveling • Global Server Theme
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits, 
    SlashCommandBuilder 
} = require('discord.js');
const mongoose = require('mongoose');
const config = require('../config');
const ServerSettings = require('../models/ServerSettings');
const { getGuildLanguageSync } = require('../utils/i18n');

function cleanImageUrl(str) {
    if (!str || typeof str !== 'string' || str === 'undefined') return '';
    return str.trim().replace(/[\`\<\>\s]/g, '');
}

function isValidUrl(str) {
    const cleaned = cleanImageUrl(str);
    if (!cleaned) return false;
    try {
        const url = new URL(cleaned);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isValidHex(color) {
    if (!color || typeof color !== 'string' || color === 'undefined') return false;
    return /^#([0-9A-F]{3}){1,2}$/i.test(color.trim());
}

// In-Memory Server Theme Cache for 0ms access
const themeCache = new Map();

async function getGuildTheme(guildId) {
    if (!guildId) return {};
    if (themeCache.has(guildId)) return themeCache.get(guildId);
    try {
        const settings = await ServerSettings.findOne({ guildId }).select('embedTheme').lean();
        const theme = settings?.embedTheme || {};
        themeCache.set(guildId, theme);
        return theme;
    } catch {
        return {};
    }
}

function getGuildThemeSync(guildId) {
    if (!guildId) return {};
    return themeCache.get(guildId) || {};
}

function setCachedTheme(guildId, theme) {
    if (guildId) themeCache.set(guildId, theme);
}

// ==========================================
// 1. MASTER EMBED VISUALITY STUDIO DASHBOARD
// ==========================================
async function getMasterVisualityStudio(guildId, client) {
    const settings = await ServerSettings.findOne({ guildId }).lean() || {};
    const theme = settings.embedTheme || {};
    const primaryColor = isValidHex(theme.color) ? theme.color : (config.EMBED_COLORS?.PRIMARY || '#5865F2');

    const studioEmbed = new EmbedBuilder()
        .setColor(primaryColor)
        .setTitle('🎨 Starry Embed Visuality & Design Studio')
        .setDescription(
            `Welcome to the **Embed Visuality Studio**! Customize the aesthetic design, colors, headers, banners, and typography for every feature in your server.\n\n` +
            `### 🌟 Available Feature Designers:\n` +
            `• **🌸 Welcome Embed Visuality**: Greetings, member counter, entrance GIF/banner, avatar thumbnail, custom color & text.\n` +
            `• **🥀 Goodbye Embed Visuality**: Farewell notices, census tracker, departure GIF/banner, custom color & text.\n` +
            `• **⭐ Level-Up Embed Visuality**: Rank-up unlock cards, XP targets, level banners, author header & custom color.\n` +
            `• **🎨 Server Theme & Brand**: Global embed primary color, footer branding, and author icons across general responses.\n\n` +
            `*Select a feature from the dropdown or click a quick-action button below to start customizing!*`
        )
        .addFields(
            {
                name: '🔤 Universal Placeholder Variables',
                value: '`{user}` • `{username}` • `{tag}` • `{server}` • `{count}` • `{level}` • `{xp}`',
                inline: false
            }
        )
        .setFooter({ text: 'Starry Visuality Studio • Real-time Interactive Customizer' })
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('visuality_select_feature')
        .setPlaceholder('Select a feature to customize its visuality...')
        .addOptions([
            {
                label: 'Welcome Embed Visuality',
                value: 'welcome',
                description: 'Customize welcome greeting cards, banner, and colors',
                emoji: '🌸'
            },
            {
                label: 'Goodbye Embed Visuality',
                value: 'goodbye',
                description: 'Customize farewell notices, banner, and colors',
                emoji: '🥀'
            },
            {
                label: 'Level-Up Embed Visuality',
                value: 'levels',
                description: 'Customize level unlock announcements and alerts',
                emoji: '⭐'
            },
            {
                label: 'Server Theme & Brand',
                value: 'theme',
                description: 'Customize global bot embed color and footer brand',
                emoji: '🎨'
            }
        ]);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('visuality_open_welcome').setLabel('Welcome').setStyle(ButtonStyle.Primary).setEmoji('🌸'),
        new ButtonBuilder().setCustomId('visuality_open_goodbye').setLabel('Goodbye').setStyle(ButtonStyle.Secondary).setEmoji('🥀'),
        new ButtonBuilder().setCustomId('visuality_open_levels').setLabel('Levels').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
        new ButtonBuilder().setCustomId('visuality_open_theme').setLabel('Server Theme').setStyle(ButtonStyle.Success).setEmoji('🎨')
    );

    return { embeds: [studioEmbed], components: [selectRow, buttonRow] };
}

// ==========================================
// 2. SERVER THEME & BRAND CONTROL PANEL
// ==========================================
async function getThemeControlPanel(guildId, client) {
    let settings = await ServerSettings.findOne({ guildId });
    if (!settings) settings = await ServerSettings.create({ guildId });

    const theme = settings.embedTheme || {};
    const colorDisplay = isValidHex(theme.color) ? theme.color : '#5865F2';
    const footerDisplay = theme.footer || '*Default Starry Branding*';
    const authorDisplay = theme.authorName || '*Default Bot Author*';
    const footerIconDisplay = isValidUrl(theme.footerIcon) ? `[View Icon Link](${theme.footerIcon})` : '*None*';
    const authorIconDisplay = isValidUrl(theme.authorIcon) ? `[View Icon Link](${theme.authorIcon})` : '*None*';

    const panelEmbed = new EmbedBuilder()
        .setColor(colorDisplay)
        .setTitle('🎨 Server Embed Theme & Brand Control Panel')
        .setDescription(
            `Configure global embed appearance for Starry across your server.\n\n` +
            `**🎨 Primary Hex Color:** \`${colorDisplay}\`\n` +
            `**🌸 Footer Text:** \`${footerDisplay}\`\n` +
            `**🖼️ Footer Icon URL:** ${footerIconDisplay}\n` +
            `**👑 Author Header:** \`${authorDisplay}\`\n` +
            `**🖼️ Author Icon URL:** ${authorIconDisplay}`
        )
        .setFooter({ text: 'Changes here style general bot embeds across the server.' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('theme_btn_color').setLabel('Edit Primary Color').setStyle(ButtonStyle.Primary).setEmoji('🎨'),
        new ButtonBuilder().setCustomId('theme_btn_footer').setLabel('Edit Footer & Icon').setStyle(ButtonStyle.Secondary).setEmoji('🌸'),
        new ButtonBuilder().setCustomId('theme_btn_author').setLabel('Edit Author & Icon').setStyle(ButtonStyle.Secondary).setEmoji('👑')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('theme_btn_preview').setLabel('Live Preview').setStyle(ButtonStyle.Success).setEmoji('👁️'),
        new ButtonBuilder().setCustomId('theme_btn_reset').setLabel('Reset Defaults').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('theme_btn_back').setLabel('Back to Studio').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
    );

    return { embeds: [panelEmbed], components: [row1, row2] };
}

// ==========================================
// 3. MASTER INTERACTION & DISPATCH ENGINE
// ==========================================
const embedVisualityModule = (client) => {
    client.on('interactionCreate', async (interaction) => {
        // --- 1. Master Studio Dropdown & Quick Action Buttons ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'visuality_select_feature') {
            if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need **Manage Server** or **Administrator** permissions.', ephemeral: true });
            }

            const choice = interaction.values[0];
            if (choice === 'welcome') {
                const welcomeModule = require('./welcome');
                const panel = await welcomeModule.getWelcomeControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
            if (choice === 'goodbye') {
                const goodbyeModule = require('./goodbye');
                const panel = await goodbyeModule.getGoodbyeControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
            if (choice === 'levels') {
                const levelingModule = require('./leveling');
                const panel = await levelingModule.getLevelControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
            if (choice === 'theme') {
                const panel = await getThemeControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
        }

        // --- 2. Master Studio Quick Navigation Buttons & Studio Return ---
        if (interaction.isButton() && (interaction.customId === 'visuality_btn_studio' || interaction.customId === 'theme_btn_back')) {
            if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need **Manage Server** or **Administrator** permissions.', ephemeral: true });
            }
            const studio = await getMasterVisualityStudio(interaction.guildId, client);
            return interaction.update(studio);
        }

        if (interaction.isButton() && interaction.customId.startsWith('visuality_open_')) {
            if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need **Manage Server** or **Administrator** permissions.', ephemeral: true });
            }

            const target = interaction.customId.replace('visuality_open_', '');
            if (target === 'welcome') {
                const welcomeModule = require('./welcome');
                const panel = await welcomeModule.getWelcomeControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
            if (target === 'goodbye') {
                const goodbyeModule = require('./goodbye');
                const panel = await goodbyeModule.getGoodbyeControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
            if (target === 'levels') {
                const levelingModule = require('./leveling');
                const panel = await levelingModule.getLevelControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
            if (target === 'theme') {
                const panel = await getThemeControlPanel(interaction.guildId, client);
                if (panel) return interaction.update(panel);
            }
        }

        // --- 3. Server Theme Buttons & Modals ---
        if (interaction.isButton() && interaction.customId.startsWith('theme_btn_')) {
            if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need **Manage Server** or **Administrator** permissions.', ephemeral: true });
            }

            let settings = await ServerSettings.findOne({ guildId: interaction.guildId });
            if (!settings) settings = await ServerSettings.create({ guildId: interaction.guildId });
            const theme = settings.embedTheme || {};

            if (interaction.customId === 'theme_btn_color') {
                const modal = new ModalBuilder().setCustomId('theme_modal_color').setTitle('Edit Primary Embed Color');
                const colorInput = new TextInputBuilder()
                    .setCustomId('in_theme_color')
                    .setLabel('Hex Color Code (e.g. #5865F2, #FF73FA)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(isValidHex(theme.color) ? theme.color : '#5865F2')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(colorInput));
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'theme_btn_footer') {
                const modal = new ModalBuilder().setCustomId('theme_modal_footer').setTitle('Edit Global Footer & Icon');
                const footerInput = new TextInputBuilder()
                    .setCustomId('in_theme_footer')
                    .setLabel('Custom Footer Text')
                    .setStyle(TextInputStyle.Short)
                    .setValue(theme.footer || '')
                    .setPlaceholder('Leave empty for standard branding')
                    .setRequired(false);

                const iconInput = new TextInputBuilder()
                    .setCustomId('in_theme_footer_icon')
                    .setLabel('Footer Icon Image URL')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(theme.footerIcon || '')
                    .setPlaceholder('Paste icon image URL or leave empty')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(footerInput), new ActionRowBuilder().addComponents(iconInput));
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'theme_btn_author') {
                const modal = new ModalBuilder().setCustomId('theme_modal_author').setTitle('Edit Global Author & Icon');
                const authorInput = new TextInputBuilder()
                    .setCustomId('in_theme_author')
                    .setLabel('Custom Author Header Name')
                    .setStyle(TextInputStyle.Short)
                    .setValue(theme.authorName || '')
                    .setPlaceholder('e.g. Starry Network • Community')
                    .setRequired(false);

                const iconInput = new TextInputBuilder()
                    .setCustomId('in_theme_author_icon')
                    .setLabel('Author Icon Image URL')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(theme.authorIcon || '')
                    .setPlaceholder('Paste icon image URL or leave empty')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(authorInput), new ActionRowBuilder().addComponents(iconInput));
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'theme_btn_preview') {
                const latestSettings = await ServerSettings.findOne({ guildId: interaction.guildId }).lean() || {};
                const t = latestSettings.embedTheme || {};
                const previewColor = isValidHex(t.color) ? t.color : '#5865F2';

                const previewEmbed = new EmbedBuilder()
                    .setColor(previewColor)
                    .setTitle('🎨 Sample Themed Embed Preview')
                    .setDescription('This is a preview demonstrating your server\'s customized brand color, typography, and footer visuality across Starry responses!')
                    .addFields(
                        { name: '✨ Feature 1', value: 'Dynamic server layout visuality', inline: true },
                        { name: '🌟 Feature 2', value: 'High-contrast responsive aesthetics', inline: true }
                    )
                    .setTimestamp();

                if (t.authorName) {
                    const authorOpts = { name: t.authorName };
                    if (isValidUrl(t.authorIcon)) authorOpts.iconURL = t.authorIcon;
                    previewEmbed.setAuthor(authorOpts);
                }

                if (t.footer) {
                    const footerOpts = { text: `${t.footer} (Theme Preview)` };
                    if (isValidUrl(t.footerIcon)) footerOpts.iconURL = t.footerIcon;
                    previewEmbed.setFooter(footerOpts);
                } else {
                    previewEmbed.setFooter({ text: `${interaction.guild.name} • Theme Preview` });
                }

                return interaction.reply({ content: '🧪 **Global Theme Live Preview:**', embeds: [previewEmbed], ephemeral: true });
            }

            if (interaction.customId === 'theme_btn_reset') {
                const defs = { color: '#5865F2', footer: '', footerIcon: '', authorName: '', authorIcon: '' };
                await ServerSettings.findOneAndUpdate(
                    { guildId: interaction.guildId },
                    { $set: { embedTheme: defs } }
                );
                setCachedTheme(interaction.guildId, defs);

                await interaction.reply({ content: '🔄 **Server embed theme reset to defaults!**', ephemeral: true });
                const panel = await getThemeControlPanel(interaction.guildId, client);
                if (interaction.message && panel) {
                    await interaction.message.edit(panel).catch(() => {});
                }
                return;
            }
        }

        // --- 4. Server Theme Modal Submissions ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith('theme_modal_')) {
            const guildId = interaction.guildId;
            let currentTheme = await getGuildTheme(guildId);
            currentTheme = { ...currentTheme };

            if (interaction.customId === 'theme_modal_color') {
                let color = interaction.fields.getTextInputValue('in_theme_color');
                if (!isValidHex(color)) color = '#5865F2';
                currentTheme.color = color;
                await ServerSettings.findOneAndUpdate({ guildId }, { $set: { 'embedTheme.color': color } }, { upsert: true });
            }

            if (interaction.customId === 'theme_modal_footer') {
                const footer = interaction.fields.getTextInputValue('in_theme_footer') || '';
                let footerIcon = cleanImageUrl(interaction.fields.getTextInputValue('in_theme_footer_icon'));
                if (!isValidUrl(footerIcon)) footerIcon = '';
                currentTheme.footer = footer;
                currentTheme.footerIcon = footerIcon;
                await ServerSettings.findOneAndUpdate({ guildId }, { $set: { 'embedTheme.footer': footer, 'embedTheme.footerIcon': footerIcon } }, { upsert: true });
            }

            if (interaction.customId === 'theme_modal_author') {
                const authorName = interaction.fields.getTextInputValue('in_theme_author') || '';
                let authorIcon = cleanImageUrl(interaction.fields.getTextInputValue('in_theme_author_icon'));
                if (!isValidUrl(authorIcon)) authorIcon = '';
                currentTheme.authorName = authorName;
                currentTheme.authorIcon = authorIcon;
                await ServerSettings.findOneAndUpdate({ guildId }, { $set: { 'embedTheme.authorName': authorName, 'embedTheme.authorIcon': authorIcon } }, { upsert: true });
            }

            setCachedTheme(guildId, currentTheme);

            await interaction.reply({ content: '✅ **Server Theme Visuality Updated!**', ephemeral: true });
            const panel = await getThemeControlPanel(guildId, client);
            if (interaction.message && panel) {
                await interaction.message.edit(panel).catch(() => {});
            }
        }
    });
};

embedVisualityModule.getMasterVisualityStudio = getMasterVisualityStudio;
embedVisualityModule.getThemeControlPanel = getThemeControlPanel;
embedVisualityModule.getGuildTheme = getGuildTheme;
embedVisualityModule.getGuildThemeSync = getGuildThemeSync;
embedVisualityModule.setCachedTheme = setCachedTheme;
module.exports = embedVisualityModule;
