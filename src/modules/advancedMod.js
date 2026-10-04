const { PermissionsBitField } = require('discord.js');

module.exports = (client) => {
    // /warn, /warnings and /delwarn are handled exclusively by warnings.js.
    // Keeping a second warning handler here caused duplicate replies and mismatched option names.
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'lockdown') return;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Administrator permission required.', ephemeral: true });
        }

        const action = interaction.options.getString('action', true);
        const everyoneRole = interaction.guild.roles.everyone;

        if (action === 'lock') {
            await interaction.channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
            return interaction.reply('🔒 **CHANNEL LOCKED.** Normal members can no longer send messages here.');
        }

        await interaction.channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
        return interaction.reply('🔓 **CHANNEL UNLOCKED.** Normal members can send messages again.');
    });

    // Passive Discord-invite spam protection.
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)[a-zA-Z0-9-]+/i;
        if (!inviteRegex.test(message.content)) return;

        await message.delete().catch(() => {});
        const warning = await message.channel
            .send(`⚠️ <@${message.author.id}>, posting external Discord invites is forbidden.`)
            .catch(() => null);

        if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);

        await message.member
            .timeout(10 * 60 * 1000, 'Automod: Unauthorized Discord invite')
            .catch(() => {});
    });
};
