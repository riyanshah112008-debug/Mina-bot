// ==========================================
// 🌸 INTERACTIVE WELCOME SUITE - SCHEMA & MANAGER SUITE
// File Path: welcome.js (Part 1 of 2)
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits, 
    SlashCommandBuilder 
} = require('discord.js');
const mongoose = require('mongoose');
const { getGuildLanguageSync, getWelcomeDefaults, t } = require('../utils/i18n');

const welcomeSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    title: { type: String, default: '✨ WELCOME TO {server} ✨' },
    description: { type: String, default: '💖 Hello {user}! We are so overjoyed to have you join our family! Make sure to read the guidelines and have an amazing time here. 🌟' },
    color: { type: String, default: '#FF73FA' },
    image: { type: String, default: 'https://cdn.otakugifs.xyz/gifs/wave/61621fefb2bce465.gif' },
    thumbnail: { type: String, default: 'avatar' },
    footer: { type: String, default: '✨ Enjoy your stellar journey in {server}! ✨' },
    pingContent: { type: String, default: '💫 Welcome {user}! Grab a seat and enjoy your stay! 🥂' }
});

const DEFAULT_WELCOME_BANNER = 'https://cdn.otakugifs.xyz/gifs/wave/61621fefb2bce465.gif';
const WelcomeSettings = mongoose.models.WelcomeSettings || mongoose.model('WelcomeSettings', welcomeSchema);

const setupWelcomeCommand = new SlashCommandBuilder()
    .setName('setupwelcome')
    .setDescription('✨ Set up and interactively customize welcome messages')
    .addChannelOption(option => 
        option.setName('channel')
            .setDescription('The text channel to send aesthetic welcome cards in')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

function cleanImageUrl(str) {
    if (!str || typeof str !== 'string' || str === 'undefined' || str === 'avatar') return '';
    const cleaned = str.trim().replace(/[\`\<\>\s]/g, '');
    if (cleaned.includes('imgur.com/vH1O33q') || cleaned.includes('imgur.com/removed') || cleaned.includes('i.imgur.com/vH1O33q.gif')) {
        return DEFAULT_WELCOME_BANNER;
    }
    return cleaned;
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

function replacePlaceholders(text, member) {
    if (!text || typeof text !== 'string' || text === 'undefined') return '';
    return text
        .replace(/\{user\}/g, `<@${member.id}>`)
        .replace(/\{username\}/g, member.user.username)
        .replace(/\{tag\}/g, member.user.tag || member.user.username)
        .replace(/\{server\}/g, member.guild.name)
        .replace(/\{count\}/g, `${member.guild.memberCount}`);
}

async function getWelcomeControlPanel(guildId, client) {
    let settings = await WelcomeSettings.findOne({ guildId });
    if (!settings) return null;

    const lang = getGuildLanguageSync(guildId);
    const channelDisplay = settings.channelId ? `<#${settings.channelId}>` : '*Not Set*';
    const pingDisplay = (settings.pingContent && settings.pingContent !== 'undefined') ? settings.pingContent : '💫 Welcome {user}! Grab a seat and enjoy your stay! 🥂';
    const titleDisplay = (settings.title && settings.title !== 'undefined') ? settings.title : '✨ WELCOME TO {server} ✨';
    const descDisplay = (settings.description && settings.description !== 'undefined') ? settings.description : '💖 Hello {user}! We are so overjoyed to have you join our family! 🌟';
    const colorDisplay = isValidHex(settings.color) ? settings.color : '#FF73FA';
    const footerDisplay = (settings.footer && settings.footer !== 'undefined') ? settings.footer : '✨ Enjoy your stellar journey in {server}! ✨';
    
    const activeImage = cleanImageUrl(settings.image);
    const imageDisplay = isValidUrl(activeImage) ? `[View Media Link](${activeImage})` : '*Default GIF*';

    const panelEmbed = new EmbedBuilder()
        .setColor(colorDisplay)
        .setTitle(t(lang, 'welcome.control_panel_title', { guild: guildId }))
        .setDescription(
            `Configure and design custom welcome cards for your server.\n\n` +
            `**📍 Welcome Channel:** ${channelDisplay}\n` +
            `**💬 Message Header:** \`${pingDisplay}\`\n` +
            `**🏷️ Title:** \`${titleDisplay}\`\n` +
            `**📝 Description:** \`\`\`${descDisplay}\`\`\`\n` +
            `**🎨 Hex Color:** \`${colorDisplay}\` | **🌸 Footer:** \`${footerDisplay}\`\n` +
            `**🖼️ Banner Image/GIF:** ${imageDisplay}`
        )
        .addFields({
            name: '🔤 Supported Variables',
            value: '`{user}` • `{username}` • `{tag}` • `{server}` • `{count}`',
            inline: false
        })
        .setFooter({ text: 'Use the interactive buttons below to modify each section in real time.' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('welc_btn_text').setLabel(t(lang, 'welcome.btn_text')).setStyle(ButtonStyle.Primary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('welc_btn_media').setLabel(t(lang, 'welcome.btn_media')).setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
        new ButtonBuilder().setCustomId('welc_btn_style').setLabel(t(lang, 'welcome.btn_style')).setStyle(ButtonStyle.Secondary).setEmoji('🎨')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('welc_btn_ping').setLabel(t(lang, 'welcome.btn_ping')).setStyle(ButtonStyle.Secondary).setEmoji('💬'),
        new ButtonBuilder().setCustomId('welc_btn_preview').setLabel(t(lang, 'welcome.btn_preview')).setStyle(ButtonStyle.Success).setEmoji('👁️'),
        new ButtonBuilder().setCustomId('welc_btn_reset').setLabel('Reset Defaults').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('visuality_btn_studio').setLabel('Studio Hub').setStyle(ButtonStyle.Secondary).setEmoji('🎨')
    );

    return { embeds: [panelEmbed], components: [row1, row2] };
}

const welcomeModule = (client) => {
    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('setupwelcome', { data: setupWelcomeCommand, execute: handleSetupWelcome });
    }

    async function handleSetupWelcome(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }
        } catch (e) { return; }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply({ content: '❌ You need **Manage Server** permissions to configure welcome messages.' });
        }

        const channel = interaction.options.getChannel('channel', true);
        const lang = getGuildLanguageSync(interaction.guildId);

        let settings = await WelcomeSettings.findOne({ guildId: interaction.guildId });
        if (!settings) {
            const defs = getWelcomeDefaults(lang, interaction.guild.name);
            settings = await WelcomeSettings.create({
                guildId: interaction.guildId,
                channelId: channel.id,
                title: defs.title,
                description: defs.description,
                color: '#FF73FA',
                image: DEFAULT_WELCOME_BANNER,
                thumbnail: 'avatar',
                footer: defs.footer,
                pingContent: defs.pingContent
            });
        } else {
            settings.channelId = channel.id;
            await settings.save();
        }

        const panelData = await getWelcomeControlPanel(interaction.guildId, client);
        return interaction.editReply({ 
            content: t(lang, 'welcome.setup_success', { channel: channel.toString() }),
            ...panelData 
        });
    }

    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;

        try {
            const config = await WelcomeSettings.findOne({ guildId: member.guild.id });
            if (!config || !config.channelId) return;

            const channel = member.guild.channels.cache.get(config.channelId);
            if (!channel) return;

            const lang = getGuildLanguageSync(member.guild.id);
            const defs = getWelcomeDefaults(lang, member.guild.name);

            const isDefaultPing = !config.pingContent || config.pingContent === 'undefined' || config.pingContent.includes('Grab a seat and enjoy your stay');
            const isDefaultTitle = !config.title || config.title === 'undefined' || config.title.includes('WELCOME TO');
            const isDefaultDesc = !config.description || config.description === 'undefined' || config.description.includes('overjoyed to have you join our family');
            const isDefaultFooter = !config.footer || config.footer === 'undefined' || config.footer.includes('Enjoy your stellar journey');

            const pingRaw = isDefaultPing ? defs.pingContent : config.pingContent;
            const titleRaw = isDefaultTitle ? defs.title : config.title;
            const descRaw = isDefaultDesc ? defs.description : config.description;
            const footerRaw = isDefaultFooter ? defs.footer : config.footer;

            const pingMsg = replacePlaceholders(pingRaw, member);
            const titleMsg = replacePlaceholders(titleRaw, member);
            const descMsg = replacePlaceholders(descRaw, member);
            const footerMsg = replacePlaceholders(footerRaw, member);

            const welcomeEmbed = new EmbedBuilder()
                .setColor(isValidHex(config.color) ? config.color : '#FF73FA')
                .setTitle(titleMsg.slice(0, 256))
                .setDescription(descMsg.slice(0, 4000))
                .addFields(
                    { name: t(lang, 'welcome.member_field'), value: t(lang, 'welcome.member_count', { count: member.guild.memberCount }), inline: false },
                    { name: t(lang, 'welcome.created_field'), value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setTimestamp();

            const imageUrl = cleanImageUrl(config.image);
            if (isValidUrl(imageUrl)) {
                welcomeEmbed.setImage(imageUrl);
            }

            const thumbUrl = cleanImageUrl(config.thumbnail);
            if (config.thumbnail === 'avatar') {
                welcomeEmbed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
            } else if (isValidUrl(thumbUrl)) {
                welcomeEmbed.setThumbnail(thumbUrl);
            }

            if (footerMsg) {
                welcomeEmbed.setFooter({ text: footerMsg.slice(0, 2048) });
            }

            await channel.send({ content: pingMsg, embeds: [welcomeEmbed] }).catch(() => {});
        } catch (error) {
            console.error('[Welcome Engine Error]:', error);
        }
    });
                // ==========================================
// 🌸 INTERACTIVE WELCOME SUITE - INTERACTION CONTROLLERS
// File Path: welcome.js (Part 2 of 2)
// ==========================================

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setupwelcome') await handleSetupWelcome(interaction);
            return;
        }

        // ==========================================
        // 🔘 INTERACTIVE EMBED MANAGER BUTTON HANDLERS
        // ==========================================
        if (interaction.isButton() && interaction.customId.startsWith('welc_btn_')) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ You need **Manage Server** permissions.', ephemeral: true });
            }

            let settings = await WelcomeSettings.findOne({ guildId: interaction.guildId });
            if (!settings) return interaction.reply({ content: '❌ Please run `/setupwelcome` first.', ephemeral: true });

            // EDIT TITLE & DESCRIPTION MODAL
            if (interaction.customId === 'welc_btn_text') {
                const modal = new ModalBuilder().setCustomId('welc_modal_text').setTitle('Edit Welcome Title & Text');
                
                const titleInput = new TextInputBuilder()
                    .setCustomId('in_title')
                    .setLabel('Welcome Embed Title')
                    .setStyle(TextInputStyle.Short)
                    .setValue((settings.title && settings.title !== 'undefined') ? settings.title : '✨ WELCOME TO {server} ✨')
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('in_desc')
                    .setLabel('Welcome Description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue((settings.description && settings.description !== 'undefined') ? settings.description : '💖 Hello {user}! We are so overjoyed to have you join our family! 🌟')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descInput));
                return interaction.showModal(modal);
            }

            // EDIT BANNER & THUMBNAIL MODAL
            if (interaction.customId === 'welc_btn_media') {
                const modal = new ModalBuilder().setCustomId('welc_modal_media').setTitle('Edit Banner & Thumbnail');

                const imageInput = new TextInputBuilder()
                    .setCustomId('in_image')
                    .setLabel('Banner Image/GIF URL')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Paste image/GIF URL (e.g., https://... or Discord CDN link)')
                    .setValue(cleanImageUrl(settings.image) || DEFAULT_WELCOME_BANNER)
                    .setRequired(false);

                const thumbInput = new TextInputBuilder()
                    .setCustomId('in_thumb')
                    .setLabel('Thumbnail ("avatar" or custom image URL)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue((settings.thumbnail && settings.thumbnail !== 'undefined') ? settings.thumbnail : 'avatar')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(imageInput), new ActionRowBuilder().addComponents(thumbInput));
                return interaction.showModal(modal);
            }

            // EDIT STYLE & FOOTER MODAL
            if (interaction.customId === 'welc_btn_style') {
                const modal = new ModalBuilder().setCustomId('welc_modal_style').setTitle('Edit Hex Color & Footer');

                const colorInput = new TextInputBuilder()
                    .setCustomId('in_color')
                    .setLabel('Hex Color Code (e.g. #FF73FA)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(isValidHex(settings.color) ? settings.color : '#FF73FA')
                    .setRequired(true);

                const footerInput = new TextInputBuilder()
                    .setCustomId('in_footer')
                    .setLabel('Footer Text')
                    .setStyle(TextInputStyle.Short)
                    .setValue((settings.footer && settings.footer !== 'undefined') ? settings.footer : '✨ Enjoy your stellar journey in {server}! ✨')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(colorInput), new ActionRowBuilder().addComponents(footerInput));
                return interaction.showModal(modal);
            }

            // EDIT PING HEADER MODAL
            if (interaction.customId === 'welc_btn_ping') {
                const modal = new ModalBuilder().setCustomId('welc_modal_ping').setTitle('Edit Message Ping Header');

                const pingInput = new TextInputBuilder()
                    .setCustomId('in_ping')
                    .setLabel('Content Above Embed')
                    .setStyle(TextInputStyle.Short)
                    .setValue((settings.pingContent && settings.pingContent !== 'undefined') ? settings.pingContent : '💫 Welcome {user}! Grab a seat and enjoy your stay! 🥂')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(pingInput));
                return interaction.showModal(modal);
            }

            // TEST PREVIEW CARD HANDLER
            if (interaction.customId === 'welc_btn_preview') {
                try {
                    const latestSettings = await WelcomeSettings.findOne({ guildId: interaction.guildId }) || settings;
                    const member = interaction.member;

                    const lang = getGuildLanguageSync(interaction.guildId);
                    const defs = getWelcomeDefaults(lang, member.guild.name);

                    const isDefaultPing = !latestSettings.pingContent || latestSettings.pingContent === 'undefined' || latestSettings.pingContent.includes('Grab a seat and enjoy your stay');
                    const isDefaultTitle = !latestSettings.title || latestSettings.title === 'undefined' || latestSettings.title.includes('WELCOME TO');
                    const isDefaultDesc = !latestSettings.description || latestSettings.description === 'undefined' || latestSettings.description.includes('overjoyed to have you join our family');
                    const isDefaultFooter = !latestSettings.footer || latestSettings.footer === 'undefined' || latestSettings.footer.includes('Enjoy your stellar journey');

                    const pingRaw = isDefaultPing ? defs.pingContent : latestSettings.pingContent;
                    const titleRaw = isDefaultTitle ? defs.title : latestSettings.title;
                    const descRaw = isDefaultDesc ? defs.description : latestSettings.description;
                    const footerRaw = isDefaultFooter ? defs.footer : latestSettings.footer;

                    const pingMsg = replacePlaceholders(pingRaw, member);
                    const titleMsg = replacePlaceholders(titleRaw, member);
                    const descMsg = replacePlaceholders(descRaw, member);
                    const footerMsg = replacePlaceholders(footerRaw, member);

                    const previewEmbed = new EmbedBuilder()
                        .setColor(isValidHex(latestSettings.color) ? latestSettings.color : '#FF73FA')
                        .setTitle(titleMsg.slice(0, 256))
                        .setDescription(descMsg.slice(0, 4000))
                        .addFields(
                            { name: t(lang, 'welcome.member_field'), value: t(lang, 'welcome.member_count', { count: member.guild.memberCount }), inline: false },
                            { name: t(lang, 'welcome.created_field'), value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                        )
                        .setTimestamp();

                    const imageUrl = cleanImageUrl(latestSettings.image);
                    if (isValidUrl(imageUrl)) {
                        previewEmbed.setImage(imageUrl);
                    }

                    const thumbUrl = cleanImageUrl(latestSettings.thumbnail);
                    if (latestSettings.thumbnail === 'avatar') {
                        previewEmbed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
                    } else if (isValidUrl(thumbUrl)) {
                        previewEmbed.setThumbnail(thumbUrl);
                    }

                    if (footerMsg) {
                        previewEmbed.setFooter({ text: `${footerMsg} (Setup Preview)`.slice(0, 2048) });
                    }

                    return await interaction.reply({ 
                        content: `${pingMsg} *(Setup Preview)*`, 
                        embeds: [previewEmbed], 
                        ephemeral: true 
                    });
                } catch (err) {
                    console.error('❌ Welcome Preview Error:', err);
                    return await interaction.reply({ 
                        content: `❌ **Failed to generate preview:** \`${err.message}\``, 
                        ephemeral: true 
                    }).catch(() => {});
                }
            }

            // RESET TO DEFAULTS HANDLER
            if (interaction.customId === 'welc_btn_reset') {
                const lang = getGuildLanguageSync(interaction.guildId);
                const defs = getWelcomeDefaults(lang, interaction.guild.name);
                await WelcomeSettings.findOneAndUpdate(
                    { guildId: interaction.guildId },
                    {
                        title: defs.title,
                        description: defs.description,
                        color: '#FF73FA',
                        image: DEFAULT_WELCOME_BANNER,
                        thumbnail: 'avatar',
                        footer: defs.footer,
                        pingContent: defs.pingContent
                    },
                    { upsert: true }
                );
                await interaction.reply({ content: '🔄 **Welcome embed visuality has been reset to default!**', ephemeral: true });
                const panelData = await getWelcomeControlPanel(interaction.guildId, client);
                if (interaction.message && panelData) {
                    await interaction.message.edit(panelData).catch(() => {});
                }
                return;
            }
        }

        // ==========================================
        // 📝 MODAL SUBMISSION PROCESSORS
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId.startsWith('welc_modal_')) {
            const guildId = interaction.guildId;

            if (interaction.customId === 'welc_modal_text') {
                const title = interaction.fields.getTextInputValue('in_title');
                const description = interaction.fields.getTextInputValue('in_desc');
                await WelcomeSettings.findOneAndUpdate({ guildId }, { title, description }, { upsert: true });
            }

            if (interaction.customId === 'welc_modal_media') {
                let imageRaw = interaction.fields.getTextInputValue('in_image');
                let thumbnailRaw = interaction.fields.getTextInputValue('in_thumb');
                
                let image = cleanImageUrl(imageRaw);
                let thumbnail = cleanImageUrl(thumbnailRaw);

                if (!isValidUrl(image)) {
                    image = DEFAULT_WELCOME_BANNER;
                }

                if (thumbnailRaw.trim().toLowerCase() === 'avatar') {
                    thumbnail = 'avatar';
                } else if (!isValidUrl(thumbnail)) {
                    thumbnail = 'avatar';
                }

                await WelcomeSettings.findOneAndUpdate({ guildId }, { image, thumbnail }, { upsert: true });
            }

            if (interaction.customId === 'welc_modal_style') {
                let color = interaction.fields.getTextInputValue('in_color');
                const footer = interaction.fields.getTextInputValue('in_footer');
                if (!isValidHex(color)) color = '#FF73FA';
                await WelcomeSettings.findOneAndUpdate({ guildId }, { color, footer }, { upsert: true });
            }

            if (interaction.customId === 'welc_modal_ping') {
                const pingContent = interaction.fields.getTextInputValue('in_ping');
                await WelcomeSettings.findOneAndUpdate({ guildId }, { pingContent }, { upsert: true });
            }

            await interaction.reply({ content: '✅ **Welcome Embed Design Updated!**', ephemeral: true });

            const panelData = await getWelcomeControlPanel(guildId, client);
            if (interaction.message && panelData) {
                await interaction.message.edit(panelData).catch(() => {});
            }
        }
    });
};

welcomeModule.WelcomeSettings = WelcomeSettings;
welcomeModule.setupWelcomeData = setupWelcomeCommand;
welcomeModule.getWelcomeControlPanel = getWelcomeControlPanel;
module.exports = welcomeModule;
