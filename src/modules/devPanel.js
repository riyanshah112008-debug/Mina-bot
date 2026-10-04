// ==========================================
// 👑 STARRY MASTER DEVELOPER DM CONTROL PANEL
// File Path: src/modules/devPanel.js
// Interactive Button Dashboard • Real-Time Diagnostics • Terminal Modals • Cluster Control
// 100% Restricted to Bot Owners • 1-Year Persistent Interaction Engine
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    Events
} = require('discord.js');
const os = require('os');
const { exec } = require('child_process');
const config = require('../config');

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

function buildDevPanelEmbed(client, user) {
    const memory = process.memoryUsage();
    const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotal = (memory.heapTotal / 1024 / 1024).toFixed(1);
    const rss = (memory.rss / 1024 / 1024).toFixed(1);

    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const totalChannels = client.channels.cache.size;

    const multiBot = client.multiBot;
    const clusterInstances = multiBot ? multiBot.instances.size : 1;

    const embed = new EmbedBuilder()
        .setColor('#5865F2') // Blurple / Dev Color
        .setAuthor({ 
            name: `Starry Central Developer Command OS`, 
            iconURL: client.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle(`⚡ Master Bot Developer Control Panel`)
        .setDescription(
            `Welcome <@${user.id}>! Use the interactive buttons and menus below to execute live administrative and maintenance tasks directly from this private DM console.\n\n` +
            `**Bot Tag:** \`${client.user.tag}\` | **ID:** \`${client.user.id}\`\n` +
            `**Platform:** \`${os.platform()} (${os.arch()})\` | **Node.js:** \`${process.version}\`\n` +
            `**Uptime:** \`${formatUptime(process.uptime())}\` | **Gateway Ping:** \`${client.ws.ping}ms\``
        )
        .addFields(
            {
                name: '🌐 Network Overview',
                value: 
                    `• **Servers:** \`${totalServers}\` guilds\n` +
                    `• **Users:** \`${totalUsers.toLocaleString()}\` members\n` +
                    `• **Channels:** \`${totalChannels}\` channels`,
                inline: true
            },
            {
                name: '💾 Memory & Runtime',
                value: 
                    `• **Heap Used:** \`${heapUsed} MB\` / \`${heapTotal} MB\`\n` +
                    `• **Resident RSS:** \`${rss} MB\`\n` +
                    `• **Cluster Nodes:** \`${clusterInstances}\` bots`,
                inline: true
            },
            {
                name: '🛡️ Security & Shard',
                value: 
                    `• **Status:** \`🟢 Online & Operational\`\n` +
                    `• **Cluster:** \`${config.CLUSTER_NAME || 'Starry-Network'}\`\n` +
                    `• **Process PID:** \`${process.pid}\``,
                inline: true
            }
        )
        .setFooter({ text: 'Supreme Developer Control Suite • 1-Year Response Lifetime' })
        .setTimestamp();

    return embed;
}

function buildDevPanelComponents() {
    // Row 1: Core Operations
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('dev_refresh')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('dev_telemetry')
            .setLabel('🌐 Global Telemetry')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('dev_servers')
            .setLabel('📂 Server List')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('dev_multibot')
            .setLabel('🤖 Cluster Nodes')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('dev_restart')
            .setLabel('⚡ Restart Node')
            .setStyle(ButtonStyle.Danger)
    );

    // Row 2: Advanced Developer Modals & Diagnostics
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('dev_eval_btn')
            .setLabel('💻 Run JavaScript (Eval)')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('dev_shell_btn')
            .setLabel('🖥️ Terminal Bash')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('dev_broadcast_btn')
            .setLabel('📢 Global Broadcast')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('dev_flush')
            .setLabel('🧹 Flush Memory Cache')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('dev_leave_btn')
            .setLabel('👋 Leave Server')
            .setStyle(ButtonStyle.Danger)
    );

    // Row 3: Quick Status / Presence Selector Menu
    const row3 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('dev_status_select')
            .setPlaceholder('🎭 Quick Change Bot Presence & Activity...')
            .addOptions([
                { label: 'Streaming: ,help | Starry AI', value: 'streaming', description: 'Set Twitch streaming purple status', emoji: '🟣' },
                { label: 'Playing: ,help | 160+ Commands', value: 'playing', description: 'Set playing game status', emoji: '🎮' },
                { label: 'Listening: High-Res Music & Radio', value: 'listening', description: 'Set listening to music status', emoji: '🎵' },
                { label: 'Watching: Discord Servers 24/7', value: 'watching', description: 'Set watching security status', emoji: '🛡️' },
                { label: 'Status: Do Not Disturb (DND)', value: 'status_dnd', description: 'Set red DND circle', emoji: '🔴' },
                { label: 'Status: Online (Active)', value: 'status_online', description: 'Set green Online circle', emoji: '🟢' },
                { label: 'Status: Idle (Away)', value: 'status_idle', description: 'Set yellow Idle circle', emoji: '🟡' }
            ])
    );

    return [row1, row2, row3];
}

async function sendDevPanelToUser(client, user) {
    const embed = buildDevPanelEmbed(client, user);
    const components = buildDevPanelComponents();

    try {
        const dmChannel = await user.createDM();
        const msg = await dmChannel.send({ embeds: [embed], components });
        return { success: true, message: msg };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = (client) => {
    console.log('👑 [Dev Panel Engine] Initialized Developer DM Dashboard & Button Dispatcher.');

    // Listen for Button, Select Menu, and Modal Submit interactions
    client.on(Events.InteractionCreate, async (interaction) => {
        const isOwner = config.BOT_OWNERS.includes(interaction.user.id);
        if (!isOwner) return;

        // ==========================================
        // 1. BUTTON INTERACTIONS
        // ==========================================
        if (interaction.isButton()) {
            const id = interaction.customId;

            // A. Refresh Dashboard
            if (id === 'dev_refresh') {
                const embed = buildDevPanelEmbed(client, interaction.user);
                const components = buildDevPanelComponents();
                await interaction.update({ embeds: [embed], components }).catch(() => {});
                return;
            }

            // B. Global Telemetry
            if (id === 'dev_telemetry') {
                await interaction.deferUpdate().catch(() => {});
                const { buildGlobalTelemetryEmbed } = require('./telemetryEngine');
                const GuildTelemetry = require('../models/GuildTelemetry');
                const allData = await GuildTelemetry.find({});
                const embed = buildGlobalTelemetryEmbed(client, allData);
                await interaction.followUp({ embeds: [embed], flags: [64] }).catch(() => {});
                return;
            }

            // C. Server List
            if (id === 'dev_servers') {
                await interaction.deferUpdate().catch(() => {});
                const guilds = Array.from(client.guilds.cache.values());
                const serverList = guilds.map((g, i) => 
                    `\`${i + 1}.\` **${g.name}**\n` +
                    `> 🆔 \`${g.id}\` | 👥 \`${g.memberCount}\` members | 👑 <@${g.ownerId}>`
                ).slice(0, 25).join('\n\n');

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`📂 Connected Guilds Network (${guilds.length} Total)`)
                    .setDescription(serverList + (guilds.length > 25 ? `\n\n*...and ${guilds.length - 25} more servers.*` : ''))
                    .setFooter({ text: 'Starry Developer Control Suite' })
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed], flags: [64] }).catch(() => {});
                return;
            }

            // D. Cluster Workers
            if (id === 'dev_multibot') {
                await interaction.deferUpdate().catch(() => {});
                const multiBot = client.multiBot;
                const instances = multiBot ? Array.from(multiBot.instances.values()) : [];

                const workerList = instances.map((w, idx) => {
                    const tag = w.client?.user?.tag || `Bot #${idx + 1}`;
                    const ping = w.client?.ws?.ping || 0;
                    return `• **${w.isPrimary ? '👑 Primary Node' : `🤖 Worker Node #${idx}`}**: \`${tag}\`\n` +
                           `  > Ping: \`${ping}ms\` | Role: \`${w.role || 'all'}\` | Status: \`${w.status || 'Active'}\``;
                }).join('\n\n') || '• 👑 **Primary Node**: Only primary bot active.';

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🤖 Multi-Bot Cluster & Audio Nodes')
                    .setDescription(workerList)
                    .setFooter({ text: 'Multi-Bot Distributed Architecture' })
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed], flags: [64] }).catch(() => {});
                return;
            }

            // E. Flush Memory Cache
            if (id === 'dev_flush') {
                await interaction.deferUpdate().catch(() => {});
                const beforeHeap = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
                
                if (global.gc) {
                    try { global.gc(); } catch (e) {}
                }

                const afterHeap = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
                await interaction.followUp({
                    content: `🧹 **Memory & In-Memory Caches Flushed!**\n• Before: \`${beforeHeap} MB\`\n• After: \`${afterHeap} MB\`\n• Heap Memory Freed: \`${Math.max(0, (beforeHeap - afterHeap)).toFixed(1)} MB\``,
                    flags: [64]
                }).catch(() => {});
                return;
            }

            // F. Restart Node
            if (id === 'dev_restart') {
                await interaction.reply({ content: '⚡ **Restarting Starry Bot process Supervisor (PM2)...**', flags: [64] }).catch(() => {});
                setTimeout(() => {
                    exec('pm2 restart starry-bot || ./start.sh', (err) => {
                        if (err) process.exit(0);
                    });
                }, 1000);
                return;
            }

            // G. Show JavaScript Eval Modal
            if (id === 'dev_eval_btn') {
                const modal = new ModalBuilder()
                    .setCustomId('dev_eval_modal_submit')
                    .setTitle('💻 Run JavaScript (Eval Console)');

                const codeInput = new TextInputBuilder()
                    .setCustomId('eval_code_input')
                    .setLabel('JavaScript Code to Execute')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('client.guilds.cache.size\nor\nawait GuildTelemetry.find({})')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
                await interaction.showModal(modal).catch(() => {});
                return;
            }

            // H. Show Terminal Shell Modal
            if (id === 'dev_shell_btn') {
                const modal = new ModalBuilder()
                    .setCustomId('dev_shell_modal_submit')
                    .setTitle('🖥️ Terminal Bash Shell Command');

                const cmdInput = new TextInputBuilder()
                    .setCustomId('shell_cmd_input')
                    .setLabel('Bash Shell Command')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('git status\nor\npm2 status\nor\nfree -m')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(cmdInput));
                await interaction.showModal(modal).catch(() => {});
                return;
            }

            // I. Show Global Broadcast Modal
            if (id === 'dev_broadcast_btn') {
                const modal = new ModalBuilder()
                    .setCustomId('dev_broadcast_modal_submit')
                    .setTitle('📢 Global Network Broadcast');

                const msgInput = new TextInputBuilder()
                    .setCustomId('broadcast_msg_input')
                    .setLabel('Announcement Message')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Type the announcement to send across all connected servers...')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
                await interaction.showModal(modal).catch(() => {});
                return;
            }

            // J. Show Leave Server Modal
            if (id === 'dev_leave_btn') {
                const modal = new ModalBuilder()
                    .setCustomId('dev_leave_modal_submit')
                    .setTitle('👋 Force Bot Leave Server');

                const guildIdInput = new TextInputBuilder()
                    .setCustomId('leave_guild_id_input')
                    .setLabel('18-Digit Server ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('123456789012345678')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(guildIdInput));
                await interaction.showModal(modal).catch(() => {});
                return;
            }
        }

        // ==========================================
        // 2. PRESENCE / ACTIVITY SELECT MENU
        // ==========================================
        if (interaction.isStringSelectMenu() && interaction.customId === 'dev_status_select') {
            const val = interaction.values[0];
            await interaction.deferUpdate().catch(() => {});

            if (val === 'streaming') {
                client.user.setPresence({
                    activities: [{ name: ',help | Starry AI', type: 1, url: 'https://twitch.tv/discord' }],
                    status: 'online'
                });
            } else if (val === 'playing') {
                client.user.setPresence({
                    activities: [{ name: ',help | 160+ Commands', type: 0 }],
                    status: 'online'
                });
            } else if (val === 'listening') {
                client.user.setPresence({
                    activities: [{ name: 'High-Res Audio & Radio', type: 2 }],
                    status: 'online'
                });
            } else if (val === 'watching') {
                client.user.setPresence({
                    activities: [{ name: `${client.guilds.cache.size} Servers 24/7`, type: 3 }],
                    status: 'online'
                });
            } else if (val === 'status_dnd') {
                client.user.setStatus('dnd');
            } else if (val === 'status_online') {
                client.user.setStatus('online');
            } else if (val === 'status_idle') {
                client.user.setStatus('idle');
            }

            await interaction.followUp({
                content: `🎭 **Bot Presence Updated to:** \`${val}\`!`,
                flags: [64]
            }).catch(() => {});
            return;
        }

        // ==========================================
        // 3. MODAL SUBMISSIONS
        // ==========================================
        if (interaction.isModalSubmit()) {
            const id = interaction.customId;

            // A. JavaScript Eval Modal
            if (id === 'dev_eval_modal_submit') {
                await interaction.deferReply({ flags: [64] });
                const code = interaction.fields.getTextInputValue('eval_code_input');

                const start = process.hrtime.bigint();
                let result;
                let isError = false;

                try {
                    result = await eval(code);
                    if (typeof result !== 'string') {
                        result = require('util').inspect(result, { depth: 1 });
                    }
                } catch (err) {
                    isError = true;
                    result = err.stack || err.toString();
                }

                const end = process.hrtime.bigint();
                const timeTaken = `${(Number(end - start) / 1e6).toFixed(2)}ms`;

                if (process.env.DISCORD_TOKEN) result = result.replace(new RegExp(process.env.DISCORD_TOKEN, 'g'), '[SECRET_TOKEN]');
                if (process.env.MONGO_URI) result = result.replace(new RegExp(process.env.MONGO_URI, 'g'), '[SECRET_MONGO]');
                if (result.length > 1900) result = result.substring(0, 1900) + '... (truncated)';

                const embed = new EmbedBuilder()
                    .setColor(isError ? '#ED4245' : '#2ECC71')
                    .setTitle(isError ? '❌ Evaluation Error' : '✅ Evaluation Output')
                    .addFields(
                        { name: '📥 Input Code', value: `\`\`\`js\n${code.substring(0, 500)}\n\`\`\`` },
                        { name: '📤 Result', value: `\`\`\`js\n${result}\n\`\`\`` },
                        { name: '⏱️ Execution Time', value: `\`${timeTaken}\``, inline: true }
                    )
                    .setFooter({ text: 'Starry Developer Engine' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // B. Terminal Shell Modal
            if (id === 'dev_shell_modal_submit') {
                await interaction.deferReply({ flags: [64] });
                const command = interaction.fields.getTextInputValue('shell_cmd_input');

                exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
                    const output = stdout || stderr || (error ? error.message : 'Executed with no output.');
                    let cleaned = output.trim();
                    if (cleaned.length > 1900) cleaned = cleaned.substring(0, 1900) + '... (truncated)';

                    const embed = new EmbedBuilder()
                        .setColor(error ? '#ED4245' : '#5865F2')
                        .setTitle('🖥️ Terminal Bash Output')
                        .addFields(
                            { name: '💻 Command', value: `\`\`\`bash\n${command}\n\`\`\`` },
                            { name: '📄 Output', value: `\`\`\`bash\n${cleaned || 'Success (empty output)'}\n\`\`\`` }
                        )
                        .setFooter({ text: 'Starry Developer Engine' })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                });
                return;
            }

            // C. Global Broadcast Modal
            if (id === 'dev_broadcast_modal_submit') {
                await interaction.deferReply({ flags: [64] });
                const msg = interaction.fields.getTextInputValue('broadcast_msg_input');

                let count = 0;
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('📢 Starry Global Announcement')
                    .setDescription(msg)
                    .setFooter({ text: 'Official Bot Announcement' })
                    .setTimestamp();

                for (const g of client.guilds.cache.values()) {
                    const ch = g.systemChannel || g.channels.cache.find(c => c.type === 0 && c.permissionsFor(g.members.me)?.has(PermissionFlagsBits.SendMessages));
                    if (ch) {
                        await ch.send({ embeds: [embed] }).then(() => count++).catch(() => {});
                    }
                }

                return interaction.editReply(`✅ Broadcast delivered to **${count}** server channels!`);
            }

            // D. Leave Server Modal
            if (id === 'dev_leave_modal_submit') {
                await interaction.deferReply({ flags: [64] });
                const targetGuildId = interaction.fields.getTextInputValue('leave_guild_id_input').trim();
                const guild = client.guilds.cache.get(targetGuildId);

                if (!guild) {
                    return interaction.editReply(`❌ Server ID \`${targetGuildId}\` was not found in the bot's cache.`);
                }

                const name = guild.name;
                await guild.leave().catch(() => {});
                return interaction.editReply(`👋 Successfully left server **${name}** (\`${targetGuildId}\`).`);
            }
        }
    });
};

module.exports.sendDevPanelToUser = sendDevPanelToUser;
module.exports.buildDevPanelEmbed = buildDevPanelEmbed;
module.exports.buildDevPanelComponents = buildDevPanelComponents;
