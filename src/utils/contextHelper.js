// ==========================================
// 🛠️ STARRY UNIFIED COMMAND CONTEXT ENGINE
// File Path: src/utils/contextHelper.js
// Universal normalizer for Discord.js Message and ChatInputCommandInteraction
// Compatible across Phone (Termux) & PC (Windows/Linux/macOS)
// ==========================================
const { MessageFlags, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { getGuildLanguage, getGuildLanguageSync, localizePayload } = require('./i18n');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;
const ONE_YEAR_MS = config.ONE_YEAR_MS || 2147483647;

class CommandContext {
    constructor(source, client, args = []) {
        this.source = source;
        this.client = client;
        this.isSlash = !!(source.isChatInputCommand && source.isChatInputCommand());
        
        // Normalized user & author
        this.user = this.isSlash ? source.user : source.author;
        this.author = this.user;
        this.member = source.member;
        const isRealGuild = Boolean(source.guild);
        this.inGuild = isRealGuild;
        this.isDM = !isRealGuild || (source.channel && (typeof source.channel.isDMBased === 'function' ? source.channel.isDMBased() : source.channel.type === 1));
        this.guild = isRealGuild ? source.guild : null;
        this.guildId = isRealGuild ? source.guild.id : null;
        this.channel = source.channel;
        this.channelId = source.channelId || (source.channel ? source.channel.id : null);
        this.lang = this.guildId ? getGuildLanguageSync(this.guildId) : 'en';
        
        this.interaction = this.isSlash ? source : null;
        this.message = !this.isSlash ? source : null;
        this.replied = false;
        this.deferred = false;
        this.replyMessage = null;

        // Parse args and options
        this.args = Array.isArray(args) ? [...args] : [];

        if (this.isSlash && source.options && Array.isArray(source.options.data)) {
            const extracted = [];
            const parseOptions = (opts) => {
                for (const opt of opts) {
                    if (opt.value !== undefined) {
                        extracted.push(String(opt.value));
                    }
                    if (opt.options && Array.isArray(opt.options)) {
                        parseOptions(opt.options);
                    }
                }
            };
            parseOptions(source.options.data);
            if (extracted.length > 0) {
                this.args = extracted;
            }
        }

        // Universal Options Resolver (Works identically for Prefix and Slash)
        if (this.isSlash) {
            this.options = source.options;
        } else {
            this.options = {
                getString: (name, req = false) => {
                    const text = this.args.join(' ').trim();
                    return text || (req ? '' : null);
                },
                getInteger: (name) => {
                    const val = parseInt(this.args[0], 10);
                    return isNaN(val) ? null : val;
                },
                getNumber: (name) => {
                    const val = parseFloat(this.args[0]);
                    return isNaN(val) ? null : val;
                },
                getUser: (name) => {
                    return this.message?.mentions?.users?.first() || null;
                },
                getMember: (name) => {
                    return this.message?.mentions?.members?.first() || null;
                },
                getChannel: (name) => {
                    return this.message?.mentions?.channels?.first() || this.channel;
                },
                getRole: (name) => {
                    return this.message?.mentions?.roles?.first() || null;
                },
                getBoolean: (name) => {
                    if (!this.args[0]) return false;
                    const val = this.args[0].toLowerCase();
                    return val === 'true' || val === 'yes' || val === 'on' || val === 'enable' || val === '1';
                },
                getSubcommand: () => {
                    return this.args[0]?.toLowerCase() || null;
                }
            };
        }
    }

    async defer(ephemeral = false) {
        if (this.isSlash) {
            if (!this.source.deferred && !this.source.replied) {
                const deferOpts = ephemeral ? { flags: [EPHEMERAL_FLAG] } : {};
                await this.source.deferReply(deferOpts).catch(() => {});
                this.deferred = true;
            }
        } else {
            if (this.channel && typeof this.channel.sendTyping === 'function') {
                this.channel.sendTyping().catch(() => {});
            }
            this.deferred = true;
        }
    }

    async deferReply(opts = {}) {
        return this.defer(opts.ephemeral || (opts.flags && opts.flags.includes(EPHEMERAL_FLAG)));
    }

    async reply(options) {
        if (this.replied) {
            if (this.replyMessage) return this.replyMessage;
            return null;
        }
        this.replied = true;

        let payload = options;
        if (typeof options === 'string') {
            payload = { content: options };
        } else if (payload && typeof payload === 'object') {
            payload = { ...payload };
            if (payload.ephemeral) {
                payload.flags = [EPHEMERAL_FLAG];
                delete payload.ephemeral;
            }
        }

        // Automatic Server Language Localization
        if (this.guildId && (!this.lang || this.lang === 'en')) {
            this.lang = await getGuildLanguage(this.guildId);
        }
        if (this.lang && this.lang !== 'en') {
            payload = localizePayload(payload, this.lang);
        }

        // Automatic Server Embed Theme Visuality Application
        if (this.guildId && payload.embeds && Array.isArray(payload.embeds)) {
            try {
                const { getGuildThemeSync } = require('../modules/embedVisuality');
                const theme = getGuildThemeSync(this.guildId);
                if (theme && (theme.color || theme.footer)) {
                    for (const emb of payload.embeds) {
                        const targetData = emb.data || emb;
                        if (theme.color && (!targetData.color || targetData.color === 5793266 || targetData.color === 0x5865F2)) {
                            if (typeof emb.setColor === 'function') {
                                emb.setColor(theme.color);
                            } else {
                                targetData.color = parseInt(theme.color.replace('#', ''), 16);
                            }
                        }
                        if (theme.footer && (!targetData.footer || !targetData.footer.text)) {
                            const footerObj = { text: theme.footer };
                            if (theme.footerIcon) footerObj.iconURL = theme.footerIcon;
                            if (typeof emb.setFooter === 'function') {
                                emb.setFooter(footerObj);
                            } else {
                                targetData.footer = footerObj;
                            }
                        }
                    }
                }
            } catch (e) {}
        }

        if (this.isSlash) {
            if (this.source.deferred || this.source.replied) {
                this.replyMessage = await this.source.editReply(payload).catch(() => null);
            } else {
                this.replyMessage = await this.source.reply({ ...payload, withResponse: true }).then(r => r.resource?.message || r).catch(async () => {
                    return await this.source.fetchReply().catch(() => null);
                });
            }
        } else {
            // Check if another client is targeted (Multi-Bot routing)
            if (this.client && this.source.client && this.client.user?.id !== this.source.client.user?.id) {
                try {
                    const targetChannel = this.client.channels.cache.get(this.channel.id) || await this.client.channels.fetch(this.channel.id).catch(() => null);
                    if (targetChannel) {
                        this.replyMessage = await targetChannel.send({
                            ...payload,
                            reply: { messageReference: this.source.id, failIfNotExists: false }
                        }).catch(async () => await targetChannel.send(payload).catch(() => null));
                    }
                } catch (e) {
                    this.replyMessage = null;
                }
            }

            if (!this.replyMessage) {
                this.replyMessage = await this.source.reply(payload).catch(async () => {
                    if (this.channel) return await this.channel.send(payload).catch(() => null);
                    return null;
                });
            }
        }
        this.replied = true;
        return this.replyMessage;
    }

    async editReply(options) {
        let payload = options;
        if (typeof options === 'string') {
            payload = { content: options };
        }
        if (this.lang && this.lang !== 'en') {
            payload = localizePayload(payload, this.lang);
        }

        if (this.isSlash) {
            this.replyMessage = await this.source.editReply(payload).catch(() => null);
        } else {
            if (this.replyMessage && typeof this.replyMessage.edit === 'function') {
                this.replyMessage = await this.replyMessage.edit(payload).catch(() => null);
            } else {
                this.replyMessage = await this.reply(payload);
            }
        }
        return this.replyMessage;
    }

    async followUp(options) {
        let payload = options;
        if (typeof options === 'string') {
            payload = { content: options };
        }
        if (this.lang && this.lang !== 'en') {
            payload = localizePayload(payload, this.lang);
        }

        if (this.isSlash) {
            return await this.source.followUp(payload).catch(() => null);
        } else {
            if (this.channel) {
                return await this.channel.send(payload).catch(() => null);
            }
            return null;
        }
    }

    async send(options) {
        let payload = options;
        if (typeof options === 'string') {
            payload = { content: options };
        }
        if (this.lang && this.lang !== 'en') {
            payload = localizePayload(payload, this.lang);
        }
        if (this.channel) {
            return await this.channel.send(payload).catch(() => null);
        }
        return null;
    }

    create1YearCollector(messageOrReply, options = {}) {
        const target = messageOrReply || this.replyMessage;
        if (!target || typeof target.createMessageComponentCollector !== 'function') return null;

        const collectorOptions = {
            time: ONE_YEAR_MS,
            ...options
        };

        return target.createMessageComponentCollector(collectorOptions);
    }
}

module.exports = {
    CommandContext,
    ONE_YEAR_MS,
    EPHEMERAL_FLAG
};
