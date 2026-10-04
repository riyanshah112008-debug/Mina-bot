const { ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'vcData.json');

module.exports = (client) => {
    function getVcData() {
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ setups: {}, activeVCs: [] }));
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }

    function saveVcData(data) {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    }

    // ==========================================
    // 1. SLASH COMMANDS
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'setupvc') return;
        
        // 🛑 Premium Lock
        if (!client.isPremium(interaction.guildId)) {
            return interaction.reply({ content: '❌ **Join-to-Create VC is a Premium feature!** Use `.premium` to upgrade.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        const data = getVcData();
        
        data.setups[interaction.guild.id] = channel.id;
        saveVcData(data);

        await interaction.reply({ content: `✅ Successfully set <#${channel.id}> as the "Join to Create" hub!`, ephemeral: true });
    });

    // ==========================================
    // 2. DYNAMIC CHANNEL LOGIC
    // ==========================================
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const data = getVcData();
        const hubChannelId = data.setups[newState.guild?.id || oldState.guild.id];

        // USER JOINS HUB
        if (newState.channelId === hubChannelId && hubChannelId !== null) {
            try {
                const member = newState.member;
                const tempChannel = await newState.guild.channels.create({
                    name: `${member.user.username}'s Lounge`,
                    type: ChannelType.GuildVoice,
                    parent: newState.channel.parentId,
                    permissionOverwrites: [
                        { id: newState.guild.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers] }
                    ]
                });

                await member.voice.setChannel(tempChannel);
                data.activeVCs.push(tempChannel.id);
                saveVcData(data);
            } catch (err) { console.error("VC Create Error:", err.message); }
        }

        // USER LEAVES TEMPORARY CHANNEL
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
            if (data.activeVCs.includes(oldState.channelId)) {
                const channel = oldState.guild.channels.cache.get(oldState.channelId);
                if (channel && channel.members.size === 0) {
                    try {
                        await channel.delete();
                        data.activeVCs = data.activeVCs.filter(id => id !== oldState.channelId);
                        saveVcData(data);
                    } catch (err) { console.error("VC Delete Error:", err.message); }
                }
            }
        }
    });
};
    
