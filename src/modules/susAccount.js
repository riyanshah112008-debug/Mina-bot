const { EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const path = require('path');

const storageFile = path.join(__dirname, 'sus_accounts.json');
const susSettingsCache = new Map();

function loadSusSettings() {
    try {
        if (fs.existsSync(storageFile)) {
            const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
            for (const [k, v] of Object.entries(data)) {
                susSettingsCache.set(k, v);
            }
        }
    } catch (e) {}
}
loadSusSettings();

function saveSusSetting(guildId, setting) {
    susSettingsCache.set(guildId, setting);
    try {
        const obj = Object.fromEntries(susSettingsCache);
        fs.writeFileSync(storageFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {}
}

module.exports = (client) => {
    // ==========================================
    // 1. SETTINGS COMMAND (/sussetup)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'sussetup') return;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        }

        const enabled = interaction.options.getBoolean('enabled');
        const days = interaction.options.getInteger('threshold');
        const action = interaction.options.getString('action');

        saveSusSetting(interaction.guildId, {
            guild_id: interaction.guildId,
            enabled: enabled ? 1 : 0,
            threshold_days: days || 7,
            action: action || 'warn'
        });

        interaction.reply({ content: `✅ **Suspicious Account Settings Updated:**\nEnabled: **${enabled}**\nThreshold: **${days} days**\nAction: **${(action || 'warn').toUpperCase()}**`, ephemeral: true });
    });

    // ==========================================
    // 2. THE DETECTION ENGINE
    // ==========================================
    client.on('guildMemberAdd', async (member) => {
        const settings = susSettingsCache.get(member.guild.id);
        if (!settings || !settings.enabled) return;

        // Calculate Age
        const accountAgeMs = Date.now() - member.user.createdTimestamp;
        const daysOld = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

        if (daysOld <= settings.threshold_days) {
            // Check if protected (from Protect.js)
            if (client.isUserProtected && client.isUserProtected(member.guild.id, member.id)) return;

            const embed = new EmbedBuilder()
                .setColor(settings.action === 'warn' ? '#FEE75C' : '#ED4245')
                .setTitle('🚨 Suspicious Account Detected')
                .setDescription(`<@${member.id}> joined the server.`)
                .addFields(
                    { name: 'Account Age', value: `${daysOld} days old`, inline: true },
                    { name: 'Threshold', value: `${settings.threshold_days} days`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            const logChannel = member.guild.systemChannel;
            if (logChannel) await logChannel.send({ embeds: [embed] }).catch(() => {});

            // 🔒 PREMIUM CHECK: Only perform Auto-Action if Premium
            const isPremium = client.isPremium && client.isPremium(member.guild.id);

            if (isPremium) {
                if (settings.action === 'kick' && member.kickable) {
                    await member.kick('Suspicious account age').catch(() => {});
                } else if (settings.action === 'ban' && member.bannable) {
                    await member.ban({ reason: 'Suspicious account age' }).catch(() => {});
                }
            } else {
                if (logChannel) await logChannel.send('⚠️ **Auto-action ignored:** Server is not Premium.');
            }
        }
    });
};
            
