// ==========================================
// 🎵 STARRY MUSIC SETUP COMMAND
// File Path: src/commands/music/setup.js
// Deploys the dedicated interactive Music Controller request channel
// ==========================================
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const musicController = require('../../modules/musicController');
const config = require('../../config');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('🎵 Deploy the dedicated Starry Music Controller channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    name: 'setup',
    aliases: ['musicsetup', 'setcontroller', 'controller', 'requestchannel', 'setmusic'],
    category: 'Music',
    description: 'Deploy the dedicated Starry Music Controller channel where users send song names/links directly.',
    usage: ',setup',
    permissions: [PermissionFlagsBits.ManageGuild],

    async execute(interaction, client) {
        // Permission check
        const member = interaction.member;
        const isOwner = config.BOT_OWNERS?.includes(interaction.user?.id || interaction.author?.id);
        const hasPerm = member?.permissions?.has(PermissionFlagsBits.ManageGuild) || member?.permissions?.has(PermissionFlagsBits.Administrator) || isOwner;

        if (!hasPerm) {
            const replyFunc = interaction.reply || interaction.followUp;
            return replyFunc.call(interaction, {
                content: '❌ You need the **Manage Server** permission to deploy the Music Controller.',
                flags: [EPHEMERAL_FLAG]
            });
        }

        if (typeof interaction.deferReply === 'function') {
            await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});
        } else if (typeof interaction.defer === 'function') {
            await interaction.defer().catch(() => {});
        }

        try {
            const guild = interaction.guild;
            const user = interaction.user || interaction.author;
            const { channel } = await musicController.setupChannel(guild, user, client);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎵 Starry Music Controller Deployed!')
                .setDescription(
                    `Successfully set up your dedicated music request channel: <#${channel.id}>\n\n` +
                    `✨ **How to use:**\n` +
                    `• Join any voice channel in this server\n` +
                    `• Go to <#${channel.id}>\n` +
                    `• Type any song title or link (Spotify, SoundCloud, YouTube, etc.)\n` +
                    `• The bot will instantly play it and keep the channel clean!\n\n` +
                    `🎛️ **Interactive Controls:**\n` +
                    `Use the button controller in <#${channel.id}> to pause, skip, adjust volume, toggle True Vibration Bass, and manage your session.`
                )
                .setFooter({ text: 'Starry Controller System' });

            const replyFunc = interaction.editReply || interaction.reply;
            return replyFunc.call(interaction, { embeds: [embed], flags: [EPHEMERAL_FLAG] });
        } catch (err) {
            console.error('❌ Error setting up music channel:', err);
            const replyFunc = interaction.editReply || interaction.reply;
            return replyFunc.call(interaction, {
                content: `⚠️ Failed to setup music controller: \`${err.message}\``,
                flags: [EPHEMERAL_FLAG]
            });
        }
    }
};
