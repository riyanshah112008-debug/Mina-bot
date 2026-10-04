const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const buildAdminHelpEmbed = (client) => {
    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🛡️ Starry Management & Emergency Suite')
        .setDescription('Complete command index for server administration, emergency lockdown, disaster recovery, and automated setup.')
        .addFields(
            {
                name: '🚨 Emergency Protocols (Admins Only)',
                value: 
                '`/emergency-nuke` — Vaporizes all channels & custom roles (spares General).\n' +
                '`/emergency-lockdown` — Freezes typing & voice access for `@everyone` across all channels.\n' +
                '`/emergency-secure` — Strips dangerous permissions (Admin, Kick, Ban, Manage) from roles.\n' +
                '`/emergency-unban` — Mass unbans every user in the server ban list.\n' +
                '`/emergency-webhooks` — Deletes all webhooks across the server to stop bypass spam.\n' +
                '`/emergency-vckick` — Forcefully disconnects everyone from all voice channels.\n' +
                '`/emergency-quarantine` — Applies a 7-day timeout to all members who joined in the last 24h.'
            },
            {
                name: '💾 Backup & Disaster Recovery',
                value: 
                '`.backup` — Saves a full MongoDB snapshot of all roles, categories, channels & permission overwrites.\n' +
                '`.restore` — Reconstructs missing channels/roles and re-applies saved permission overwrites.'
            },
            {
                name: '⚙️ Master Setup & Configuration',
                value: 
                '`.setup-starry` / `/setup-starry` — Scans server channels and auto-links all modules (Logs, Tickets, Boosts, Chests, etc.).\n' +
                '`/setup-server` — Auto-builds the complete premium category, channel & role structure.\n' +
                '`/set-name` — Customizes the bot\'s trigger word/identity for your server.\n' +
                '`/boost-setup` — Configures the dedicated channel for server boost announcements.'
            },
            {
                name: '🔨 Moderation Suite',
                value: 
                '`/ban` & `/unban` — Ban or unban a user.\n' +
                '`/kick` — Kick a user from the server.\n' +
                '`/timeout` & `/untimeout` — Mute or unmute a member for a duration.\n' +
                '`/warn` & `/warnings` — Issue a formal warning or check a member\'s log.\n' +
                '`/purge` / `/clear` — Bulk deletes a specified number of chat messages.\n' +
                '`/lock` & `/unlock` — Lock or unlock a specific channel.'
            },
            {
                name: '🤖 AI Natural Language Moderation',
                value: 
                'Interact directly with Starry via natural messages:\n' +
                '> *"Starry timeout @user for 10 minutes for spamming."*\n' +
                '> *"Starry clear 30 messages."*\n' +
                '> *"Starry give @user the VIP role."*'
            }
        )
        .setFooter({ text: 'Starry Protocol • Admin Control Panel', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ahelp')
        .setDescription('Displays the complete Admin & Moderation Command Menu')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const embed = buildAdminHelpEmbed(interaction.client);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
    
    buildAdminHelpEmbed
};
