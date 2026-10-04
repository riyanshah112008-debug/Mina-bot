const { ChannelType, PermissionsBitField } = require('discord.js');

module.exports = (client) => {
    // ==========================================
    // SMART RATE-LIMIT MANAGER
    // ==========================================
    const pendingUpdates = new Set();
    const lastUpdated = new Map();
    const COOLDOWN_MS = 6 * 60 * 1000; // 6 Minutes (Discord allows 2 renames per 10 mins)

    const updateStats = async (guild) => {
        if (!guild) return;
        
        const now = Date.now();
        const last = lastUpdated.get(guild.id) || 0;
        
        // If we are on cooldown, queue it for later and stop here
        if (now - last < COOLDOWN_MS) {
            pendingUpdates.add(guild.id);
            return;
        }

        try {
            const memberCountChannel = guild.channels.cache.find(c => c.name.startsWith('👥 Members:'));
            const botCountChannel = guild.channels.cache.find(c => c.name.startsWith('🤖 Bots:'));

            // If the server doesn't have the channels, don't waste resources calculating
            if (!memberCountChannel && !botCountChannel) return;

            // Use official memberCount for total, subtract cached bots for accurate human count
            const total = guild.memberCount;
            const bots = guild.members.cache.filter(m => m.user.bot).size;
            const humans = total - bots;

            if (memberCountChannel) {
                const newName = `👥 Members: ${humans}`;
                if (memberCountChannel.name !== newName) {
                    await memberCountChannel.setName(newName).catch(() => {});
                }
            }
            if (botCountChannel) {
                const newName = `🤖 Bots: ${bots}`;
                if (botCountChannel.name !== newName) {
                    await botCountChannel.setName(newName).catch(() => {});
                }
            }

            // Record the time of this successful update and remove from queue
            lastUpdated.set(guild.id, Date.now());
            pendingUpdates.delete(guild.id);
        } catch (err) {
            console.error(`Stats Update Error for ${guild.id}:`, err.message);
        }
    };

    // Every 1 minute, check the queue to see if any guilds are off cooldown and need an update
    setInterval(() => {
        for (const guildId of pendingUpdates) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) updateStats(guild);
        }
    }, 60000);

    // ==========================================
    // 1. SLASH COMMAND (/setupstats)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'setupstats') return;

        // 🛑 Admin Only
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You need **Administrator** permissions to set this up!', ephemeral: true }).catch(() => {});
        }

        await interaction.reply({ content: '⏳ Setting up live stat channels...', ephemeral: true }).catch(() => {});

        try {
            let category = interaction.guild.channels.cache.find(c => c.name === '📊 SERVER STATS' && c.type === ChannelType.GuildCategory);
            if (!category) {
                category = await interaction.guild.channels.create({ name: '📊 SERVER STATS', type: ChannelType.GuildCategory });
            }

            const total = interaction.guild.memberCount;
            const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
            const humans = total - bots;

            await interaction.guild.channels.create({
                name: `👥 Members: ${humans}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                // Deny connect permissions so users can't actually join the stat channels
                permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
            });

            await interaction.guild.channels.create({
                name: `🤖 Bots: ${bots}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
            });

            await interaction.editReply({ content: '✅ Server stat channels successfully created!' }).catch(() => {});
            
            // Log the initial setup time to start the cooldown timer
            lastUpdated.set(interaction.guild.id, Date.now());
        } catch (error) {
            await interaction.editReply({ content: '❌ Failed to create channels. Ensure Starry has `Manage Channels` and `Administrator` permissions.' }).catch(() => {});
        }
    });

    // ==========================================
    // 2. LISTENERS
    // ==========================================
    // Trigger the smart update system whenever someone joins or leaves
    client.on('guildMemberAdd', member => updateStats(member.guild));
    client.on('guildMemberRemove', member => updateStats(member.guild));
};
                
