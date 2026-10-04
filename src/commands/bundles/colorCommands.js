// ==========================================
// 🎨 STARRY HEX BLEND & NAME COLOR COMMANDS
// File Path: src/commands/bundles/colorCommands.js
// Multi-Tenant Personal Name Color & Blend Suite
// Supports: No-Role Server Profile Mode & Shared Role Pool Mode
// Zero-Boost Discord Name Color Customization Engine
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ComponentType
} = require('discord.js');
const colorBlendEngine = require('../../utils/colorBlendEngine');
const colorRoleEngine = require('../../modules/colorRoleEngine');
const ServerSettings = require('../../models/ServerSettings');

/**
 * Format a rich confirmation embed for applied colors (Profile & Role modes)
 */
function buildAppliedColorEmbed(result, member, title = '🎨 Name Color Updated!') {
    const isGradient = Boolean(result.secondaryHex);
    const embed = new EmbedBuilder()
        .setColor(result.primaryHex || result.blendedHex)
        .setTitle(title)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp()
        .setFooter({ text: 'Starry Hex Blend & Discord Gradient Studio' });

    let desc = '';
    const ansiPreview = result.ansiGradientText 
        ? `🌈 **Discord Live Gradient Preview:**\n${result.ansiGradientText}\n\n` 
        : '';

    if (result.mode === 'profile') {
        desc += `✅ **Directly Applied to Server Profile!** *(Zero roles created)*\n\n` +
                (result.nicknameApplied ? `👤 **Server Profile Nickname:** \`${result.newNickname}\`\n` : '') +
                (result.nicknameWarning ? `⚠️ **Note:** *${result.nicknameWarning}*\n` : '') +
                `🎨 **Style:** ${isGradient ? 'Discord Dual-Color Spectrum' : 'Solid Hex Tone'}\n` +
                `🎯 **Primary Color (Start):** \`${result.primaryHex}\`\n` +
                (isGradient ? `🎯 **Secondary Color (End):** \`${result.secondaryHex}\`\n` : '') +
                (result.tertiaryHex ? `🎯 **Tertiary Color (Accent):** \`${result.tertiaryHex}\`\n` : '') +
                (isGradient && result.ratio !== 50 ? `🔀 **Gradient Bias:** \`${result.ratio}% / ${100 - result.ratio}%\`\n` : '') +
                `\n${ansiPreview}` +
                (isGradient ? `🌈 **Gradient Transition:**\n${colorBlendEngine.generateVisualBar(result.primaryHex, result.secondaryHex)}\n\n` : '') +
                `👁️ **Readability:** ${result.readability.rating} (Dark: \`${result.readability.darkContrast}:1\`, Light: \`${result.readability.lightContrast}:1\`)`;
    } else {
        const boostBadge = result.appliedNativeGradient 
            ? '✨ **Discord Enhanced Role Gradient Active** *(Server has 3+ boosts unlocked)*' 
            : '⚡ **Discord Dual-Color Spectrum Active** *(Optimized for all clients — No server boosts needed!)*';

        const poolNote = result.createdNewRole 
            ? '🆕 Created new shared palette role' 
            : `♻️ Reused shared role (${result.sharedMembersCount || 1} members sharing — 0 duplicate roles!)`;

        desc += `Successfully equipped gradient role <@&${result.role.id}>!\n` +
                `💡 *${poolNote}*\n\n` +
                `🎨 **Style:** ${isGradient ? 'Enhanced Role Gradient' : 'Solid Hex Tone'}\n` +
                `🎯 **Primary Color (Start):** \`${result.primaryHex}\`\n` +
                (isGradient ? `🎯 **Secondary Color (End):** \`${result.secondaryHex}\`\n` : '') +
                (result.tertiaryHex ? `🎯 **Tertiary Color (Accent):** \`${result.tertiaryHex}\`\n` : '') +
                (isGradient && result.ratio !== 50 ? `🔀 **Gradient Bias:** \`${result.ratio}% / ${100 - result.ratio}%\`\n` : '') +
                `\n${ansiPreview}` +
                (isGradient ? `🌈 **Gradient Transition:**\n${colorBlendEngine.generateVisualBar(result.primaryHex, result.secondaryHex)}\n\n` : '') +
                (isGradient ? `${boostBadge}\n\n` : '') +
                `👁️ **Readability:** ${result.readability.rating} (Dark: \`${result.readability.darkContrast}:1\`, Light: \`${result.readability.lightContrast}:1\`)`;
    }

    embed.setDescription(desc);
    return embed;
}

const commands = [
    {
        name: 'color',
        aliases: ['colour', 'namecolor', 'mycolor', 'blendcolor', 'hexblend', 'gradient'],
        category: 'Utility',
        description: 'Customize your username with Discord dual gradients, hex blends, or zero-role server profile mode without server boosts!',
        usage: ',color <blend|gradient|profile|preset|mode|random|preview|info|remove|#hex> [args]',
        permissions: [],
        async execute(ctx) {
            if (!ctx.guild) return ctx.reply('❌ This command can only be used inside a Discord server.');

            const prefix = ctx.prefix || ',';
            const member = ctx.member;
            const isSlash = Boolean(ctx.isSlash);
            const sub = (isSlash ? (ctx.options?.getSubcommand?.(false) || ctx.args[0] || 'info') : (ctx.args[0] || 'info')).toLowerCase();

            // Fetch server settings to determine default mode
            const settings = await colorRoleEngine.getSettings(ctx.guild.id);
            const config = settings.colorRoleSystem || {};
            const serverMode = config.mode || 'shared';

            // ==========================================
            // SUBCOMMAND: PROFILE / NOROLE / NICK (ZERO ROLES CREATED)
            // ==========================================
            if (sub === 'profile' || sub === 'norole' || sub === 'nick') {
                const arg1 = isSlash ? (ctx.options?.getString?.('color1') || ctx.args[0]) : ctx.args[1];
                const arg2 = isSlash ? (ctx.options?.getString?.('color2') || ctx.args[1]) : ctx.args[2];
                const ratioRaw = isSlash ? (ctx.options?.getInteger?.('ratio') ?? ctx.args[2]) : ctx.args[3];

                if (!arg1) {
                    return ctx.reply(
                        `👤 **Zero-Role Server Profile Color Mode** *(Directly modifies server profile with 0 roles created!)*\n\n` +
                        `🔹 **Usage:** \`${prefix}color profile <#Hex1> [#Hex2] [Ratio%]\` or \`${prefix}color profile <preset>\`\n` +
                        `• \`${prefix}color profile #FF0055 #00E5FF\` *(Discord Dual-Color Spectrum on Profile)*\n` +
                        `• \`${prefix}color profile cyberpunk\` *(Aesthetic Preset on Profile)*\n` +
                        `• \`${prefix}color profile #FF73FA\` *(Solid Hex Tone on Profile)*\n\n` +
                        `💡 *This mode directly applies an aesthetic color badge and theme to your Server Profile without creating ANY roles in the server!*`
                    );
                }

                let rawColor1 = arg1;
                let rawColor2 = arg2;
                if ((rawColor1?.toLowerCase() === 'preset' || rawColor1?.toLowerCase() === 'palette') && rawColor2) {
                    rawColor1 = rawColor2;
                    rawColor2 = isSlash ? null : ctx.args[3];
                }

                // Check if rawColor1 is a preset name
                const preset = colorBlendEngine.getPreset(rawColor1);
                let hex1 = null;
                let hex2 = null;
                let presetName = null;

                if (preset) {
                    hex1 = preset.hex1;
                    hex2 = preset.hex2;
                    presetName = preset.name;
                } else {
                    hex1 = colorBlendEngine.parseHex(rawColor1);
                    if (!hex1) {
                        return ctx.reply(`❌ Invalid color or preset \`${rawColor1}\`. Use a valid hex code (e.g. \`#FF0055\`) or preset name.`);
                    }
                    if (rawColor2) {
                        hex2 = colorBlendEngine.parseHex(rawColor2);
                    }
                }

                let ratio = 50;
                if (ratioRaw !== undefined && ratioRaw !== null && ratioRaw !== '') {
                    const parsedRatio = parseInt(ratioRaw, 10);
                    if (!isNaN(parsedRatio)) ratio = Math.max(0, Math.min(100, parsedRatio));
                }

                try {
                    const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                        colorType: 'profile',
                        applyMode: 'profile',
                        primaryColor: hex1,
                        secondaryColor: hex2,
                        ratio,
                        presetName
                    });

                    const embed = buildAppliedColorEmbed(result, member, '✨ Server Profile Color Applied! (No Roles)');
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not apply profile color:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: SET (,color set #hex or /color set hex:)
            // ==========================================
            if (sub === 'set') {
                const hexRaw = isSlash ? (ctx.options?.getString?.('hex') || ctx.args[0]) : ctx.args[1];
                if (!hexRaw) {
                    return ctx.reply(`🔹 **Usage:** \`${prefix}color set <#HexCode>\`\n*Example:* \`${prefix}color set #FF73FA\``);
                }
                const parsedHex = colorBlendEngine.parseHex(hexRaw);
                if (!parsedHex) {
                    return ctx.reply(`❌ Invalid hex color code \`${hexRaw}\`. Example: \`#FF0055\``);
                }
                try {
                    const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                        colorType: serverMode === 'profile' ? 'profile' : 'solid',
                        applyMode: serverMode,
                        primaryColor: parsedHex
                    });
                    const embed = buildAppliedColorEmbed(result, member, '🎨 Solid Color Applied!');
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not apply color:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: BLEND / GRADIENT (,color blend #hex1 #hex2 [ratio])
            // ==========================================
            if (sub === 'blend' || sub === 'gradient' || sub === 'dual') {
                const hex1Raw = isSlash ? (ctx.options?.getString?.('color1') || ctx.args[0]) : ctx.args[1];
                const hex2Raw = isSlash ? (ctx.options?.getString?.('color2') || ctx.args[1]) : ctx.args[2];
                const ratioRaw = isSlash ? (ctx.options?.getInteger?.('ratio') ?? ctx.args[2]) : ctx.args[3];

                let hex1 = null;
                let hex2 = null;
                let presetName = null;

                const preset = hex1Raw ? colorBlendEngine.getPreset(hex1Raw) : null;
                if (preset && !hex2Raw) {
                    hex1 = preset.hex1;
                    hex2 = preset.hex2;
                    presetName = preset.name;
                } else {
                    if (!hex1Raw || !hex2Raw) {
                        return ctx.reply(
                            `🔹 **Usage:** \`${prefix}color blend <#Hex1> <#Hex2> [Ratio%]\` or \`${prefix}color blend <preset>\`\n` +
                            `*Examples:*\n` +
                            `• \`${prefix}color blend #FF0055 #00E5FF\` *(Discord Dual-Color Spectrum)*\n` +
                            `• \`${prefix}color blend cyberpunk\` *(Aesthetic Cyberpunk Preset)*\n` +
                            `• \`${prefix}color blend #FF512F #DD2476\` *(Sunset Magenta)*\n\n` +
                            `💡 *Combines Discord's Primary & Secondary gradient features — No server boosts needed!*\n` +
                            `👉 *Want zero roles created? Use:* \`${prefix}color profile <#Hex1> <#Hex2>\``
                        );
                    }

                    hex1 = colorBlendEngine.parseHex(hex1Raw);
                    hex2 = colorBlendEngine.parseHex(hex2Raw);

                    if (!hex1) return ctx.reply(`❌ Invalid first color \`${hex1Raw}\`. Please provide a valid hex code (e.g. \`#FF0055\`) or color name.`);
                    if (!hex2) return ctx.reply(`❌ Invalid second color \`${hex2Raw}\`. Please provide a valid hex code (e.g. \`#00E5FF\`) or color name.`);
                }

                let ratio = 50;
                if (ratioRaw !== undefined && ratioRaw !== null && ratioRaw !== '') {
                    const parsedRatio = parseInt(ratioRaw, 10);
                    if (!isNaN(parsedRatio)) {
                        ratio = Math.max(0, Math.min(100, parsedRatio));
                    }
                }

                try {
                    const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                        colorType: serverMode === 'profile' ? 'profile' : 'blend',
                        applyMode: serverMode,
                        primaryColor: hex1,
                        secondaryColor: hex2,
                        ratio: ratio,
                        presetName: presetName
                    });

                    const embed = buildAppliedColorEmbed(result, member, '✨ Discord Gradient Applied!');
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not apply color:** ${err.message}`);
                }
            }

            // ==========================================
            // DIRECT HEX CODES: ,color #hex1 [#hex2]
            // ==========================================
            const directHex1 = colorBlendEngine.parseHex(ctx.args[0]);
            if (directHex1) {
                const directHex2 = colorBlendEngine.parseHex(ctx.args[1]);

                if (directHex2) {
                    try {
                        const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                            colorType: serverMode === 'profile' ? 'profile' : 'blend',
                            applyMode: serverMode,
                            primaryColor: directHex1,
                            secondaryColor: directHex2,
                            ratio: 50
                        });
                        const embed = buildAppliedColorEmbed(result, member, '✨ Hex Blend Color Applied!');
                        return ctx.reply({ embeds: [embed] });
                    } catch (err) {
                        return ctx.reply(`❌ **Could not apply color:** ${err.message}`);
                    }
                }

                try {
                    const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                        colorType: serverMode === 'profile' ? 'profile' : 'solid',
                        applyMode: serverMode,
                        primaryColor: directHex1
                    });
                    const embed = buildAppliedColorEmbed(result, member, '🎨 Solid Color Applied!');
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not apply color:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: PRESET / PRESETS / PALETTE / LIST
            // ==========================================
            if (sub === 'preset' || sub === 'presets' || sub === 'palette' || sub === 'list') {
                const presetQuery = (isSlash ? (ctx.options?.getString?.('name') || ctx.args[0] || '') : ctx.args.slice(1).join(' ')).trim();

                if (presetQuery) {
                    const preset = colorBlendEngine.getPreset(presetQuery);
                    if (!preset) {
                        return ctx.reply(
                            `❌ Preset \`${presetQuery}\` not found.\n` +
                            `👉 Use \`${prefix}color presets\` to browse all 26 aesthetic presets!`
                        );
                    }

                    try {
                        const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                            colorType: serverMode === 'profile' ? 'profile' : 'preset',
                            applyMode: serverMode,
                            primaryColor: preset.hex1,
                            secondaryColor: preset.hex2,
                            ratio: 50,
                            presetName: preset.name
                        });

                        const embed = buildAppliedColorEmbed(
                            result, 
                            member, 
                            `${preset.emoji} Preset Applied: ${preset.name}`
                        );
                        return ctx.reply({ embeds: [embed] });
                    } catch (err) {
                        return ctx.reply(`❌ **Could not apply preset:** ${err.message}`);
                    }
                }

                // Show interactive Preset Browser Menu
                const grouped = colorBlendEngine.getPresetsByCategory();
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎨 Starry Aesthetic Color Palette Studio')
                    .setDescription(
                        `Choose from **26 Hand-Crafted Master Presets** below!\n` +
                        `Use \`${prefix}color preset <name>\` or select an option from the menu below.\n\n` +
                        `*All presets work on any server without requiring 3 server boosts!*`
                    )
                    .setFooter({ text: 'Select a preset from the dropdown menu to apply instantly!' });

                for (const [catName, presetList] of Object.entries(grouped)) {
                    const listStr = presetList.map(p => 
                        `${p.emoji} **${p.name}** (\`${p.id}\`): \`${p.hex1}\` ➔ \`${p.hex2}\``
                    ).join('\n');
                    embed.addFields({ name: `━━ ${catName} Palette ━━`, value: listStr, inline: false });
                }

                const selectOptions = Object.values(colorBlendEngine.PRESETS).slice(0, 25).map(p => ({
                    label: p.name,
                    value: p.id,
                    description: p.description.slice(0, 100),
                    emoji: p.emoji
                }));

                const selectRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`color_preset_select_${ctx.author.id}`)
                        .setPlaceholder('✨ Pick an aesthetic blend preset...')
                        .addOptions(selectOptions)
                );

                const responseMsg = await ctx.reply({ embeds: [embed], components: [selectRow] });

                const filter = i => i.customId === `color_preset_select_${ctx.author.id}` && i.user.id === ctx.author.id;
                const collector = responseMsg.createMessageComponentCollector?.({
                    filter,
                    componentType: ComponentType.StringSelect,
                    time: 120000
                });

                if (collector) {
                    collector.on('collect', async (i) => {
                        const selectedId = i.values[0];
                        const preset = colorBlendEngine.getPreset(selectedId);
                        if (!preset) return i.reply({ content: '❌ Preset not found.', ephemeral: true });

                        await i.deferUpdate().catch(() => {});
                        try {
                            const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                                colorType: serverMode === 'profile' ? 'profile' : 'preset',
                                applyMode: serverMode,
                                primaryColor: preset.hex1,
                                secondaryColor: preset.hex2,
                                ratio: 50,
                                presetName: preset.name
                            });

                            const updateEmbed = buildAppliedColorEmbed(
                                result, 
                                member, 
                                `${preset.emoji} Preset Applied: ${preset.name}`
                            );
                            await i.editReply({ embeds: [updateEmbed], components: [] });
                        } catch (err) {
                            await i.followUp({ content: `❌ Error: ${err.message}`, ephemeral: true }).catch(() => {});
                        }
                    });

                    collector.on('end', () => {
                        responseMsg.edit({ components: [] }).catch(() => {});
                    });
                }

                return;
            }

            // ==========================================
            // SUBCOMMAND: MODE (,color mode <profile|shared>)
            // ==========================================
            if (sub === 'mode') {
                const requestedMode = (ctx.args[1] || '').toLowerCase();
                if (requestedMode !== 'profile' && requestedMode !== 'shared') {
                    return ctx.reply(
                        `🔹 **Usage:** \`${prefix}color mode <profile|shared>\`\n\n` +
                        `• \`${prefix}color mode profile\` — **No-Role Mode:** Directly modifies server profile nickname with zero roles created!\n` +
                        `• \`${prefix}color mode shared\` — **Shared Role Pool Mode:** Reuses pooled roles across members so zero duplicate roles are created.`
                    );
                }

                const status = await colorRoleEngine.getColorRoleStatus(ctx.guild, member.id);
                if (!status || !status.doc) {
                    return ctx.reply(
                        `✅ Preferred mode set to **${requestedMode.toUpperCase()}**!\n` +
                        `Now apply your color using \`${prefix}color blend <hex1> <hex2>\` or \`${prefix}color preset <name>\`.`
                    );
                }

                try {
                    const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                        colorType: requestedMode === 'profile' ? 'profile' : (status.doc.secondaryColor ? 'blend' : 'solid'),
                        applyMode: requestedMode,
                        primaryColor: status.doc.primaryColor,
                        secondaryColor: status.doc.secondaryColor,
                        ratio: status.doc.ratio,
                        presetName: status.doc.presetName
                    });

                    const embed = buildAppliedColorEmbed(result, member, `🔄 Switched to ${requestedMode === 'profile' ? 'No-Role Profile' : 'Shared Role'} Mode!`);
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not switch mode:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: RANDOM (,color random)
            // ==========================================
            if (sub === 'random') {
                const randomChoice = colorBlendEngine.randomBlend();
                try {
                    const result = await colorRoleEngine.applyColorRole(ctx.guild, member, {
                        colorType: serverMode === 'profile' ? 'profile' : 'random',
                        applyMode: serverMode,
                        primaryColor: randomChoice.hex1,
                        secondaryColor: randomChoice.hex2,
                        ratio: 50
                    });

                    const embed = buildAppliedColorEmbed(
                        result, 
                        member, 
                        '🎲 Random Vibrant Blend Applied!'
                    );
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not apply random color:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: PREVIEW (,color preview #hex1 [#hex2])
            // ==========================================
            if (sub === 'preview') {
                const hex1Raw = isSlash ? (ctx.options?.getString?.('color1') || ctx.args[0]) : ctx.args[1];
                const hex2Raw = isSlash ? (ctx.options?.getString?.('color2') || ctx.args[1]) : ctx.args[2];

                if (!hex1Raw) {
                    return ctx.reply(`🔹 **Usage:** \`${prefix}color preview <#Hex1> [#Hex2]\`\n*Example:* \`${prefix}color preview #FF0055 #00E5FF\``);
                }

                let hex1 = null;
                let hex2 = null;
                const preset = colorBlendEngine.getPreset(hex1Raw);
                if (preset && !hex2Raw) {
                    hex1 = preset.hex1;
                    hex2 = preset.hex2;
                } else {
                    hex1 = colorBlendEngine.parseHex(hex1Raw);
                    if (!hex1) return ctx.reply(`❌ Invalid first color code \`${hex1Raw}\`.`);
                    hex2 = hex2Raw ? colorBlendEngine.parseHex(hex2Raw) : null;
                }

                const readability = colorBlendEngine.analyzeDiscordReadability(hex1);
                const memberDisplayName = member.displayName || member.user.username;
                const ansiPreview = hex2 
                    ? colorBlendEngine.getGradientPreview(memberDisplayName, hex1, hex2) 
                    : null;

                const embed = new EmbedBuilder()
                    .setColor(hex1)
                    .setTitle('🔍 Discord Gradient & Color Preview')
                    .setDescription(
                        hex2 
                            ? `🎨 **Primary Color (Start):** \`${hex1}\`\n` +
                              `🎨 **Secondary Color (End):** \`${hex2}\`\n\n` +
                              (ansiPreview ? `🌈 **Discord Live Gradient Preview:**\n${ansiPreview}\n\n` : '') +
                              `🌈 **Gradient Transition:**\n${colorBlendEngine.generateVisualBar(hex1, hex2)}\n\n` +
                              `👁️ **Readability:** ${readability.rating} (Dark: \`${readability.darkContrast}:1\`, Light: \`${readability.lightContrast}:1\`)\n\n` +
                              `👉 *To apply via Shared Role:* \`${prefix}color blend ${hex1} ${hex2}\`\n` +
                              `👉 *To apply to Server Profile (Zero Roles):* \`${prefix}color profile ${hex1} ${hex2}\``
                            : `💎 **Color Code:** \`${hex1}\`\n\n` +
                              `👁️ **Readability:** ${readability.rating} (Dark: \`${readability.darkContrast}:1\`, Light: \`${readability.lightContrast}:1\`)\n\n` +
                              `👉 *To apply via Role:* \`${prefix}color ${hex1}\`\n` +
                              `👉 *To apply to Profile (No Roles):* \`${prefix}color profile ${hex1}\``
                    )
                    .setFooter({ text: 'Starry Hex Blend & Discord Gradient Studio' });

                return ctx.reply({ embeds: [embed] });
            }

            // ==========================================
            // SUBCOMMAND: REMOVE / RESET / DELETE
            // ==========================================
            if (sub === 'remove' || sub === 'reset' || sub === 'delete' || sub === 'clear') {
                try {
                    const result = await colorRoleEngine.removeColorRole(ctx.guild, member);
                    if (result.success) {
                        const embed = new EmbedBuilder()
                            .setColor('#ED4245')
                            .setTitle('🗑️ Custom Name Color Reset')
                            .setDescription(result.message || 'Your custom name color has been removed.')
                            .setFooter({ text: 'Use ,color blend or ,color profile to equip a color anytime!' });
                        return ctx.reply({ embeds: [embed] });
                    } else {
                        return ctx.reply(`ℹ️ ${result.message}`);
                    }
                } catch (err) {
                    return ctx.reply(`❌ **Could not remove color:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: INFO (,color info [@user])
            // ==========================================
            if (sub === 'info' || sub === 'mycolor' || sub === 'status') {
                const slashUser = isSlash ? (ctx.options?.getUser?.('user') || ctx.options?.getMember?.('user')) : null;
                const targetMember = slashUser 
                    ? (ctx.guild.members.cache.get(slashUser.id) || await ctx.guild.members.fetch(slashUser.id).catch(() => null))
                    : (ctx.message?.mentions?.members?.first() || member);
                if (!targetMember) return ctx.reply('❌ Could not find that member in this server.');
                const status = await colorRoleEngine.getColorRoleStatus(ctx.guild, targetMember.id);

                if (!status || !status.doc) {
                    const isSelf = targetMember.id === member.id;
                    const msg = isSelf 
                        ? `ℹ️ You do not currently have an active custom color configured.\n\n` +
                          `👉 **Get started right now:**\n` +
                          `• \`${prefix}color profile #FF0055 #00E5FF\` *(Zero-Role Profile Mode)*\n` +
                          `• \`${prefix}color blend #FF0055 #00E5FF\` *(Shared Role Mode)*\n` +
                          `• \`${prefix}color preset cyberpunk\` *(Aesthetic Preset)*\n` +
                          `• \`${prefix}color presets\` *(Browse 26 palettes)*`
                        : `ℹ️ <@${targetMember.id}> does not have a custom color configured.`;

                    return ctx.reply(msg);
                }

                const doc = status.doc;
                const role = status.role;
                const isProfileMode = doc.applyMode === 'profile';
                const hasGradient = Boolean(doc.secondaryColor);
                const ansiPreview = hasGradient 
                    ? colorBlendEngine.getGradientPreview(targetMember.displayName, doc.primaryColor, doc.secondaryColor) 
                    : null;

                const embed = new EmbedBuilder()
                    .setColor(doc.primaryColor || doc.blendedColor)
                    .setTitle(`🎨 Custom Color Status: ${targetMember.displayName}`)
                    .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setDescription(
                        `**System Mode:** \`${isProfileMode ? 'SERVER PROFILE (Zero Roles)' : 'SHARED ROLE POOL (Anti-Bloat)'}\`\n` +
                        (!isProfileMode && role ? `**Active Role:** <@&${role.id}> (\`${role.name}\`)\n` : '') +
                        (isProfileMode ? `**Server Nickname:** \`${targetMember.displayName}\`\n` : '') +
                        `**Primary Color (Start):** \`${doc.primaryColor}\`\n` +
                        (hasGradient ? `**Secondary Color (End):** \`${doc.secondaryColor}\`\n` : '') +
                        (doc.presetName ? `**Preset:** \`${doc.presetName}\`\n` : '') +
                        (!isProfileMode && role ? `**Hierarchy Level:** \`Position #${role.position}\`\n` : '') +
                        (ansiPreview ? `\n🌈 **Live Spectrum Preview:**\n${ansiPreview}\n` : '') +
                        (hasGradient ? `🌈 **Gradient Transition:**\n${colorBlendEngine.generateVisualBar(doc.primaryColor, doc.secondaryColor)}\n\n` : '') +
                        `👁️ **Readability:** ${status.readability.rating} (Dark: \`${status.readability.darkContrast}:1\`, Light: \`${status.readability.lightContrast}:1\`)\n\n` +
                        `💡 *Switch modes:* \`${prefix}color mode ${isProfileMode ? 'shared' : 'profile'}\`\n` +
                        `🗑️ *To remove:* \`${prefix}color remove\``
                    )
                    .setFooter({ text: 'Starry Hex Blend & Discord Gradient Studio' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }

            // ==========================================
            // SUBCOMMAND: CONFIG / ADMIN (,color config ...)
            // ==========================================
            if (sub === 'config' || sub === 'admin' || sub === 'setup') {
                if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return ctx.reply('❌ You need the `Manage Server` permission to configure the color system.');
                }

                const action = (ctx.args[1] || '').toLowerCase();
                const currentSettings = await colorRoleEngine.getSettings(ctx.guild.id);
                const currentConfig = currentSettings.colorRoleSystem || {};

                if (action === 'mode') {
                    const targetMode = (ctx.args[2] || '').toLowerCase();
                    if (targetMode !== 'profile' && targetMode !== 'shared') {
                        return ctx.reply(`🔹 **Usage:** \`${prefix}color config mode <profile|shared>\`\n• \`profile\`: No roles created at all (Server Profile mode)\n• \`shared\`: Shared role palette pool (zero duplicate roles)`);
                    }

                    await ServerSettings.findOneAndUpdate(
                        { guildId: ctx.guild.id },
                        { $set: { 'colorRoleSystem.mode': targetMode } },
                        { upsert: true }
                    );

                    return ctx.reply(`✅ Server default color mode set to **${targetMode.toUpperCase()}** (${targetMode === 'profile' ? 'Zero Roles Created' : 'Shared Role Pool'}).`);
                }

                if (action === 'toggle') {
                    const newState = !currentConfig.enabled;
                    await ServerSettings.findOneAndUpdate(
                        { guildId: ctx.guild.id },
                        { $set: { 'colorRoleSystem.enabled': newState } },
                        { upsert: true }
                    );
                    return ctx.reply(`✅ Color system is now **${newState ? 'ENABLED' : 'DISABLED'}**.`);
                }

                if (action === 'anchor') {
                    const roleMention = ctx.message?.mentions?.roles?.first() || ctx.guild.roles.cache.get(ctx.args[2]);
                    if (!roleMention && ctx.args[2] !== 'none' && ctx.args[2] !== 'clear') {
                        return ctx.reply(`🔹 **Usage:** \`${prefix}color config anchor <@Role|none>\`\n*Anchors color roles directly below this role in the hierarchy.*`);
                    }

                    const anchorId = roleMention ? roleMention.id : '';
                    await ServerSettings.findOneAndUpdate(
                        { guildId: ctx.guild.id },
                        { $set: { 'colorRoleSystem.anchorRoleId': anchorId } },
                        { upsert: true }
                    );

                    return ctx.reply(anchorId 
                        ? `✅ Hierarchy anchor role set to <@&${anchorId}>.`
                        : `✅ Anchor role cleared. Color roles will now be placed 1 position below Starry's highest role.`
                    );
                }

                // Show current configuration
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('⚙️ Starry Name Color System Settings')
                    .setDescription(
                        `**Status:** ${currentConfig.enabled !== false ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                        `**Mode:** \`${(currentConfig.mode || 'shared').toUpperCase()}\` ${currentConfig.mode === 'profile' ? '(Zero roles created)' : '(Shared role pool)'}\n` +
                        `**Anchor Role:** ${currentConfig.anchorRoleId ? `<@&${currentConfig.anchorRoleId}>` : '*None (Defaults below Starry)*'}\n` +
                        `**Member Access:** ${currentConfig.allowEveryone !== false ? '🔓 Everyone' : '🔒 Restricted'}\n\n` +
                        `**Configuration Commands:**\n` +
                        `• \`${prefix}color config mode <profile|shared>\` — Set server mode (profile = zero roles, shared = pooled roles)\n` +
                        `• \`${prefix}color config toggle\` — Enable or disable the color system\n` +
                        `• \`${prefix}color config anchor <@Role|none>\` — Set upper hierarchy boundary role`
                    )
                    .setFooter({ text: 'Starry Server Administration' });

                return ctx.reply({ embeds: [embed] });
            }

            // ==========================================
            // FALLBACK: HELP & OVERVIEW
            // ==========================================
            const helpEmbed = new EmbedBuilder()
                .setColor('#FF007F')
                .setTitle('🎨 Starry Hex Blend & Discord Gradient Studio')
                .setDescription(
                    `Easily change your username color with **Discord Dual Gradients**, **Hex Blends**, or use **Zero-Role Profile Mode** without needing 3 server boosts!\n\n` +
                    `**🚀 Zero-Role Server Profile Mode (No Roles Created!):**\n` +
                    `• \`${prefix}color profile <#Hex1> [#Hex2]\` — Directly applies dual gradient badge & theme to Server Profile (Zero roles created!)\n` +
                    `• \`${prefix}color profile preset <name>\` — Apply an aesthetic preset to Server Profile\n` +
                    `• \`${prefix}color mode profile\` — Switch your account to zero-role mode\n\n` +
                    `**✨ Shared Role Pool Mode (Anti-Bloat):**\n` +
                    `• \`${prefix}color blend <#Hex1> <#Hex2> [Ratio%]\` — Equip Discord gradient spectrum (Reuses shared role, zero duplicate roles!)\n` +
                    `• \`${prefix}color gradient <#Hex1> <#Hex2>\` — Alias for blend\n` +
                    `• \`${prefix}color <#HexCode>\` — Apply a solid hex color (e.g. \`${prefix}color #FF73FA\`)\n` +
                    `• \`${prefix}color preset <name>\` — Apply an aesthetic preset (e.g. \`cyberpunk\`, \`sunset\`)\n` +
                    `• \`${prefix}color presets\` — Browse all 26 curated aesthetic presets\n` +
                    `• \`${prefix}color random\` — Generate and apply a random vibrant blend\n` +
                    `• \`${prefix}color preview <#Hex1> [#Hex2]\` — Preview colors & live ANSI gradient without applying\n` +
                    `• \`${prefix}color info\` — View your active gradient and contrast rating\n` +
                    `• \`${prefix}color remove\` — Reset color to default\n\n` +
                    `💡 *How does it prevent role clutter?*\n` +
                    `1) **Zero-Role Mode**: Applies directly to your server profile nickname and dashboard profile without creating ANY roles in the guild.\n` +
                    `2) **Shared Pool Mode**: Reuses existing color roles so 100 people using the same color only use 1 single role total!`
                )
                .setFooter({ text: `Type ${prefix}color presets to browse aesthetic palettes!` });

            return ctx.reply({ embeds: [helpEmbed] });
        }
    }
];

module.exports = commands;
