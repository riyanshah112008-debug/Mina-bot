// ==========================================
// 🎭 STARRY SUPREME REACTION ROLES MODULE
// File Path: modules/reactionRoles.js
// ==========================================

const { PermissionsBitField, EmbedBuilder, MessageFlags } = require('discord.js');
const mongoose = require('mongoose');

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;

// Mongoose Database Schema (Cloud Persistent)
const rrSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    roleId: { type: String, required: true },
    emoji: { type: String, required: true }
});

const ReactionRoleModel = mongoose.models.ReactionRole || mongoose.model('ReactionRole', rrSchema);

module.exports = (client) => {

    // ==========================================
    // 1. MODULAR BUILDER SYSTEM (SLASH COMMANDS)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.guild || !interaction.isChatInputCommand() || interaction.commandName !== 'rr') return;

        // Admin Permissions Guard
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You need **Administrator** permissions to manage reaction roles.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        const subcommand = interaction.options.getSubcommand();

        // --- SUBCOMMAND: SPAWN THE PANEL ---
        if (subcommand === 'spawn') {
            const channel = interaction.options.getChannel('channel');
            const title = interaction.options.getString('title');
            const text = interaction.options.getString('text');

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(title)
                .setDescription(`${text}\n\n`)
                .setFooter({ text: 'Click a reaction below to get your role!' });

            try {
                const msg = await channel.send({ embeds: [embed] });
                return interaction.reply({ 
                    content: `✅ **Reaction Role panel spawned!**\n\n**Channel:** <#${channel.id}>\n**Message ID:** \`${msg.id}\`\n\nUse \`/rr add\` to start attaching roles to it!`, 
                    flags: [EPHEMERAL_FLAG] 
                }).catch(() => {});
            } catch (err) {
                return interaction.reply({ content: '❌ Failed to send panel embed. Check my channel view/send permissions!', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }

        // --- SUBCOMMAND: ADD A ROLE TO THE PANEL ---
        if (subcommand === 'add') {
            const channel = interaction.options.getChannel('channel');
            const messageId = interaction.options.getString('message_id').trim();
            const role = interaction.options.getRole('role');
            const emoji = interaction.options.getString('emoji').trim();

            const botMember = interaction.guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                return interaction.reply({ content: `❌ Cannot use <@&${role.id}>! My bot role must be higher than this role in Server Settings.`, flags: [EPHEMERAL_FLAG] });
            }

            let targetMessage;
            try {
                targetMessage = await channel.messages.fetch(messageId);
            } catch (err) {
                return interaction.reply({ content: '❌ Could not find that message. Make sure the Channel and Message ID are correct!', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }

            // Verify Emoji Validity
            try {
                await targetMessage.react(emoji);
            } catch (err) {
                return interaction.reply({ content: '❌ Failed to react with that emoji! Ensure it is a standard unicode emoji or a custom emoji from this server.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }

            // Update Embed Description
            const oldEmbed = targetMessage.embeds[0];
            if (!oldEmbed) {
                return interaction.reply({ content: '❌ That message does not contain an embed to edit.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }

            const newEmbed = EmbedBuilder.from(oldEmbed);
            const currentDesc = oldEmbed.description || '';
            
            if (!currentDesc.includes(`<@&${role.id}>`)) {
                newEmbed.setDescription(`${currentDesc}${emoji} ━ <@&${role.id}>\n`);
                await targetMessage.edit({ embeds: [newEmbed] }).catch(() => {});
            }

            // Save to MongoDB
            await ReactionRoleModel.findOneAndUpdate(
                { guildId: interaction.guild.id, messageId: targetMessage.id, emoji: emoji },
                { channelId: channel.id, roleId: role.id },
                { upsert: true }
            );

            return interaction.reply({ content: `✅ Successfully attached ${emoji} for <@&${role.id}> to panel!`, flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // --- SUBCOMMAND: REMOVE A ROLE FROM PANEL ---
        if (subcommand === 'remove') {
            const channel = interaction.options.getChannel('channel');
            const messageId = interaction.options.getString('message_id').trim();
            const emoji = interaction.options.getString('emoji').trim();

            const deleted = await ReactionRoleModel.findOneAndDelete({
                guildId: interaction.guild.id,
                messageId: messageId,
                emoji: emoji
            });

            if (!deleted) {
                return interaction.reply({ content: '❌ No reaction role configured for that Message ID and Emoji.', flags: [EPHEMERAL_FLAG] });
            }

            try {
                const targetMessage = await channel.messages.fetch(messageId);
                const userReaction = targetMessage.reactions.cache.get(emoji);
                if (userReaction) await userReaction.remove().catch(() => {});
            } catch (e) {}

            return interaction.reply({ content: `✅ Successfully removed reaction role mapping for ${emoji}!`, flags: [EPHEMERAL_FLAG] });
        }

        // --- SUBCOMMAND: LIST ALL REACTION ROLES ---
        if (subcommand === 'list') {
            const records = await ReactionRoleModel.find({ guildId: interaction.guild.id }).lean();

            if (!records || records.length === 0) {
                return interaction.reply({ content: 'ℹ️ No active reaction roles configured in this server.', flags: [EPHEMERAL_FLAG] });
            }

            const listText = records.map((r, i) => 
                `**${i + 1}.** Message: \`${r.messageId}\` | Channel: <#${r.channelId}> | ${r.emoji} ➔ <@&${r.roleId}>`
            ).join('\n');

            const listEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📜 Configured Reaction Roles')
                .setDescription(listText.slice(0, 3900))
                .setFooter({ text: `Total Active Panels: ${records.length}` })
                .setTimestamp();

            return interaction.reply({ embeds: [listEmbed], flags: [EPHEMERAL_FLAG] });
        }
    });

    // ==========================================
    // 2. ASSIGN ROLE ON REACTION ADD
    // ==========================================
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot || !reaction.message.guild) return;

        if (reaction.partial) await reaction.fetch().catch(() => {});
        if (reaction.message.partial) await reaction.message.fetch().catch(() => {});

        const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

        const rr = await ReactionRoleModel.findOne({
            messageId: reaction.message.id,
            $or: [{ emoji: reaction.emoji.name }, { emoji: emojiKey }, { emoji: reaction.emoji.toString() }]
        }).lean();

        if (rr) {
            const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
            if (member) {
                try {
                    await member.roles.add(rr.roleId);
                } catch (err) {
                    const errorMsg = await reaction.message.channel.send(`❌ <@${user.id}>, Discord blocked me from assigning that role! Ensure my bot role is placed **ABOVE** the target role in Server Settings.`).catch(() => null);
                    if (errorMsg) setTimeout(() => errorMsg.delete().catch(() => {}), 8000);
                }
            }
        }
    });

    // ==========================================
    // 3. REMOVE ROLE ON REACTION REMOVE
    // ==========================================
    client.on('messageReactionRemove', async (reaction, user) => {
        if (user.bot || !reaction.message.guild) return;

        if (reaction.partial) await reaction.fetch().catch(() => {});
        if (reaction.message.partial) await reaction.message.fetch().catch(() => {});

        const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

        const rr = await ReactionRoleModel.findOne({
            messageId: reaction.message.id,
            $or: [{ emoji: reaction.emoji.name }, { emoji: emojiKey }, { emoji: reaction.emoji.toString() }]
        }).lean();

        if (rr) {
            const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
            if (member) {
                try {
                    await member.roles.remove(rr.roleId);
                } catch (err) {
                    // Fail silently if permissions changed or member left
                }
            }
        }
    });
};
