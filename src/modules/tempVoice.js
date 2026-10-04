// ==========================================
// 🎙️ STARRY DYNAMIC ORBIT VOICE ENGINE (Join-to-Create)
// File Path: src/modules/tempVoice.js
// Automated Voice Channel Creation & Auto-Cleanup
// ==========================================
const { 
    Events, 
    ChannelType, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder 
} = require('discord.js');
const TempVoiceConfig = require('../models/TempVoiceConfig');
const config = require('../config');

// Active temp voice channels: channelId -> { ownerId, guildId }
const activeTempChannels = new Map();

function initTempVoice(client) {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        try {
            const guild = newState.guild || oldState.guild;
            if (!guild) return;

            // 1. Member joined a channel
            if (newState.channelId && newState.channelId !== oldState.channelId) {
                const conf = await TempVoiceConfig.findOne({ guildId: guild.id, enabled: true });
                if (conf && conf.lobbyChannelId === newState.channelId) {
                    const member = newState.member;
                    if (!member) return;

                    // Create temp voice channel
                    const channelName = conf.namingPattern.replace('{user}', member.displayName || member.user.username);
                    const parentCategory = conf.categoryId || newState.channel.parentId;

                    const newChannel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildVoice,
                        parent: parentCategory,
                        userLimit: conf.userLimit || 0,
                        permissionOverwrites: [
                            {
                                id: member.id,
                                allow: [
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.MoveMembers,
                                    PermissionFlagsBits.MuteMembers,
                                    PermissionFlagsBits.DeafenMembers,
                                    PermissionFlagsBits.Connect,
                                    PermissionFlagsBits.Speak
                                ]
                            }
                        ]
                    }).catch(() => null);

                    if (newChannel) {
                        activeTempChannels.set(newChannel.id, {
                            ownerId: member.id,
                            guildId: guild.id
                        });

                        // Move member into their new room
                        await member.voice.setChannel(newChannel).catch(() => {});

                        // Send control panel inside channel text chat
                        const embed = new EmbedBuilder()
                            .setColor(config.EMBED_COLORS.PRIMARY)
                            .setAuthor({ name: `${member.displayName}'s Starlight Orbit`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                            .setTitle('🎛️ Orbit Voice Control Hub')
                            .setDescription(
                                `Welcome to your private voice channel, <@${member.id}>!\nYou have full ownership over this voice room.\n\n` +
                                `• **Lock 🔒**: Prevent new members from joining\n` +
                                `• **Unlock 🔓**: Allow all members to join\n` +
                                `• **Limit 👥**: Set user capacity\n` +
                                `• *This channel auto-deletes when everyone leaves.*`
                            )
                            .setFooter({ text: 'Starry Dynamic Voice Hub' });

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`tempvc_lock_${newChannel.id}`).setLabel('Lock').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                            new ButtonBuilder().setCustomId(`tempvc_unlock_${newChannel.id}`).setLabel('Unlock').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                            new ButtonBuilder().setCustomId(`tempvc_limit2_${newChannel.id}`).setLabel('Duo (2)').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
                            new ButtonBuilder().setCustomId(`tempvc_limit5_${newChannel.id}`).setLabel('Squad (5)').setStyle(ButtonStyle.Secondary).setEmoji('🎮')
                        );

                        await newChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
                    }
                }
            }

            // 2. Member left a channel -> Check if temp channel is now empty
            if (oldState.channelId && oldState.channelId !== newState.channelId) {
                const leftChannel = oldState.channel;
                if (leftChannel && activeTempChannels.has(leftChannel.id)) {
                    // Check remaining members
                    if (leftChannel.members.size === 0) {
                        activeTempChannels.delete(leftChannel.id);
                        await leftChannel.delete('Temp Voice Channel Empty').catch(() => {});
                    }
                }
            }
        } catch (err) {
            // Silently handle voice update glitches
        }
    });

    // Handle Temp Voice Control Buttons
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;
        const customId = interaction.customId;
        if (!customId.startsWith('tempvc_')) return;

        const parts = customId.split('_');
        const action = parts[1];
        const channelId = parts[2];

        const channel = interaction.guild?.channels.cache.get(channelId);
        if (!channel) {
            return interaction.reply({ content: '❌ Channel no longer exists.', ephemeral: true });
        }

        const data = activeTempChannels.get(channelId);
        const isOwner = data && data.ownerId === interaction.user.id;
        const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);

        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: '❌ Only the creator of this orbit voice channel can adjust its controls.', ephemeral: true });
        }

        if (action === 'lock') {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
            return interaction.reply({ content: '🔒 **Orbit Locked:** No new members can join.', ephemeral: true });
        }
        if (action === 'unlock') {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
            return interaction.reply({ content: '🔓 **Orbit Unlocked:** All members may join.', ephemeral: true });
        }
        if (action === 'limit2') {
            await channel.setUserLimit(2);
            return interaction.reply({ content: '👥 **User Limit:** Set to 2 members (Duo).', ephemeral: true });
        }
        if (action === 'limit5') {
            await channel.setUserLimit(5);
            return interaction.reply({ content: '🎮 **User Limit:** Set to 5 members (Squad).', ephemeral: true });
        }
    });

    console.log('🎙️ [Temp Voice Engine] Dynamic Join-to-Create Voice Hub Armed.');
}

module.exports = {
    initTempVoice,
    activeTempChannels
};
