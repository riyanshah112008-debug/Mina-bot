// ==========================================
// ⚔️ STARRY ASTRAL RAID COMMAND SUITE
// File Path: src/commands/game/raid.js
// Real-Time Multiplayer World Boss Combat & Co-Op Raids
// ==========================================
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const { 
    spawnRaidBoss, 
    getActiveRaid, 
    BOSS_ROSTER 
} = require('../../modules/astralRaidEngine');

module.exports = {
    name: 'raid',
    description: '⚔️ Summon or battle in real-time Co-Op Astral World Boss Raids with your server',
    category: 'Game',
    usage: ',raid [spawn|status|bestiary]',
    aliases: ['boss', 'worldboss', 'bossraid'],
    autoDefer: true,

    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('⚔️ Summon or battle in real-time Co-Op Astral World Boss Raids with your server')
        .setContexts([0])
        .setIntegrationTypes([0])
        .addSubcommand(sub => 
            sub.setName('spawn')
               .setDescription('Summon a Celestial World Boss into this channel for a co-op battle')
        )
        .addSubcommand(sub => 
            sub.setName('status')
               .setDescription('View active World Boss status, health, and current strike team')
        )
        .addSubcommand(sub => 
            sub.setName('bestiary')
               .setDescription('Browse the Celestial Bestiary of legendary World Bosses and elements')
        ),

    async execute(ctx) {
        if (!ctx.guild) {
            return ctx.reply('❌ World Boss Raids can only be summoned inside a Discord server!');
        }

        let sub = 'status';
        if (ctx.isSlash) {
            sub = ctx.interaction.options.getSubcommand(false) || 'status';
        } else {
            sub = (ctx.args[0] || 'status').toLowerCase();
        }

        // ==========================================
        // SUBCOMMAND: SPAWN
        // ==========================================
        if (sub === 'spawn' || sub === 'start' || sub === 'summon') {
            const member = ctx.member;
            const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || 
                            member.permissions.has(PermissionFlagsBits.Administrator);

            const active = getActiveRaid(ctx.guild.id);
            if (active && active.active && active.currentHp > 0) {
                return ctx.reply(`⚠️ A World Boss is already actively rampaging in <#${active.channelId}>! Jump into battle there!`);
            }

            const res = await spawnRaidBoss(ctx.guild, ctx.channel);
            if (!res.success) {
                return ctx.reply(`❌ ${res.error}`);
            }

            return ctx.reply({
                content: `🚨 **THE WORLD BOSS HAS AWOKEN!** All members, prepare your strikes in the arena above!`,
                ephemeral: true
            });
        }

        // ==========================================
        // SUBCOMMAND: STATUS
        // ==========================================
        if (sub === 'status' || sub === 'check') {
            const active = getActiveRaid(ctx.guild.id);
            if (!active || !active.active || active.currentHp <= 0) {
                const idleEmbed = new EmbedBuilder()
                    .setColor('#7289DA')
                    .setTitle('⚔️ Astral Raid Arena: Peaceful')
                    .setDescription(
                        `No World Boss is currently menacing this server.\n\n` +
                        `**How to summon a Boss:**\n` +
                        `• Use \`/raid spawn\` (or \`,raid spawn\`) to summon a Celestial Boss!\n` +
                        `• Team up with server members to strike, cast spells, and earn massive XP & Credits!`
                    )
                    .setFooter({ text: 'Starry Co-Op Raid Engine' });

                return ctx.reply({ embeds: [idleEmbed] });
            }

            const embed = new EmbedBuilder()
                .setColor(active.boss.color || '#9B59B6')
                .setTitle(`⚔️ Active Raid: ${active.boss.name}`)
                .setDescription(
                    `**Arena Channel:** <#${active.channelId}>\n` +
                    `**Boss Health:** **${active.currentHp.toLocaleString()}** / **${active.maxHp.toLocaleString()} HP**\n` +
                    `**Strike Team Size:** **${active.participants.size}** raiders\n` +
                    `**Expires:** <t:${Math.floor(active.expiresAt.getTime() / 1000)}:R>`
                )
                .setFooter({ text: 'Click into the arena channel to battle!' });

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: BESTIARY
        // ==========================================
        if (sub === 'bestiary' || sub === 'bosses' || sub === 'roster') {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('📖 Celestial Bestiary: Legendary World Bosses')
                .setDescription('Encounter these mythical astral titans during Server Raids:')
                .addFields(
                    BOSS_ROSTER.map(b => ({
                        name: `${b.elementEmoji} ${b.name} (${b.element.toUpperCase()})`,
                        value: `*${b.title}*\n• **Max HP:** ${b.maxHp.toLocaleString()}\n• **Signature Moves:** ${b.skills.join(', ')}`
                    }))
                )
                .setFooter({ text: 'Summon any boss with /raid spawn!' });

            return ctx.reply({ embeds: [embed] });
        }
    }
};
