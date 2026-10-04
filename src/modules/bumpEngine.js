// ==========================================
// 1. IMPORTS & MONGOOSE SCHEMAS
// ==========================================
const { 
    EmbedBuilder, 
    PermissionsBitField, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    Events
} = require('discord.js');
const mongoose = require('mongoose');

const STARRY_WEB_URL = 'https://stately-fox-454bb4.netlify.app';

// --- SERVER LISTING SCHEMA (Directory DB) ---
const serverListingSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "A vibrant community on Starryboard!" },
    iconUrl: { type: String, default: null },
    inviteLink: { type: String, default: "Not generated yet (Run /bump)" },
    memberCount: { type: Number, default: 0 },
    ownerId: { type: String, default: null },
    tags: { type: [String], default: ['community', 'discord'] },
    bumps: { type: Number, default: 0 },
    lastBump: { type: Date, default: null },
    isNsfw: { type: Boolean, default: false },
    isListed: { type: Boolean, default: true }
});

const ServerListing = mongoose.models.ServerListing || mongoose.model('ServerListing', serverListingSchema);

// --- BUMP CONFIG SCHEMA ---
const bumpSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    reminderChannelId: { type: String, default: null }, 
    pingRoleId: { type: String, default: null },        
    nextBump: { type: Date, default: null },            
    isReady: { type: Boolean, default: true },
    autoBumpEnabled: { type: Boolean, default: false }
});

const BumpSystem = mongoose.models.BumpSystem || mongoose.model('BumpSystem', bumpSchema);

// ==========================================
// 2. SLASH COMMAND DEFINITIONS & PAYLOADS
// ==========================================
const setListingCommand = new SlashCommandBuilder()
    .setName('set-listing')
    .setDescription('Configure how your server appears on Starryboard Web Directory!')
    .addStringOption(option => 
        option.setName('description')
            .setDescription('Short description of your server (Max 150 chars)')
            .setRequired(true)
            .setMaxLength(150))
    .addStringOption(option => 
        option.setName('tags')
            .setDescription('Comma-separated tags (e.g., Gaming, Anime, Chill)')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const bumpSetupCommand = new SlashCommandBuilder()
    .setName('bump-setup')
    .setDescription('Configure auto-bump reminders & Premium Auto-Bumper.')
    .addRoleOption(option => 
        option.setName('ping_role')
            .setDescription('Role to ping when 2-hour cooldown ends.')
            .setRequired(false))
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('Channel for reminders & bump logs.')
            .setRequired(false))
    .addBooleanOption(option =>
        option.setName('auto_bump')
            .setDescription('💎 Premium: Enable 24/7 Automatic Bumping.')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const bumpCommand = new SlashCommandBuilder()
    .setName('bump')
    .setDescription('Bump this server to the top of Starryboard Directory!');

const autoBumpCommand = new SlashCommandBuilder()
    .setName('autobump')
    .setDescription('💎 Premium: Enable or disable 24/7 automatic bumping!')
    .addBooleanOption(option =>
        option.setName('status')
            .setDescription('Enable or disable 24/7 Auto-Bump')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Convert Builders to API Payloads for REST deployment
const setListingPayload = setListingCommand.toJSON();
const bumpSetupPayload = bumpSetupCommand.toJSON();
const bumpPayload = bumpCommand.toJSON();
const autoBumpPayload = autoBumpCommand.toJSON();
const bumpSlashCommands = [setListingPayload, bumpSetupPayload, bumpPayload, autoBumpPayload];

// ==========================================
// 🌐 3. REST API ENDPOINTS FOR WEBSITE FRONTEND
// ==========================================
function setupWebDirectoryAPI(app) {
    if (!app) return;

    app.get('/api/v1/servers/recently-bumped', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 6;
            const servers = await ServerListing.find({ isListed: true })
                .sort({ lastBump: -1, bumps: -1 })
                .limit(limit);

            const formatted = servers.map(s => ({
                id: s.guildId,
                name: s.name,
                icon: s.iconUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
                onlineCount: Math.floor(s.memberCount * 0.35) || 12,
                bumpedTime: s.lastBump ? getTimeAgo(s.lastBump) : 'recently',
                rating: 5.0,
                reviewCount: s.bumps || 1,
                description: s.description,
                tags: s.tags,
                inviteUrl: s.inviteLink
            }));

            res.json({ success: true, data: formatted });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/v1/servers', async (req, res) => {
        try {
            const { q, sort = 'bumped', page = 1, limit = 12, nsfw = 0 } = req.query;
            const query = { isListed: true };

            if (nsfw === '0') query.isNsfw = false;
            if (q) {
                query.$or = [
                    { name: { $regex: q, $options: 'i' } },
                    { tags: { $in: [q.toLowerCase()] } },
                    { description: { $regex: q, $options: 'i' } }
                ];
            }

            let sortOption = { lastBump: -1 };
            if (sort === 'members') sortOption = { memberCount: -1 };
            if (sort === 'newest') sortOption = { _id: -1 };

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const total = await ServerListing.countDocuments(query);
            const rawList = await ServerListing.find(query).sort(sortOption).skip(skip).limit(parseInt(limit));

            const list = rawList.map(s => ({
                id: s.guildId,
                name: s.name,
                icon: s.iconUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
                onlineCount: Math.floor(s.memberCount * 0.35) || 10,
                bumpedTime: s.lastBump ? getTimeAgo(s.lastBump) : 'recently',
                rating: 5.0,
                reviewCount: s.bumps || 1,
                description: s.description,
                tags: s.tags,
                inviteUrl: s.inviteLink
            }));

            res.json({ success: true, data: { total, list } });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/servers', async (req, res) => {
        try {
            const servers = await ServerListing.find({ isListed: true }).sort({ lastBump: -1 }).limit(50);
            res.json(servers);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// ==========================================
// 4. MAIN ENGINE MODULE FUNCTION & WORKERS
// ==========================================
const bumpEngineModule = (client, expressApp) => {

    if (expressApp) setupWebDirectoryAPI(expressApp);

    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('set-listing', { data: setListingCommand, execute: handleSetListing });
        client.commands.set('bump-setup', { data: bumpSetupCommand, execute: handleBumpSetup });
        client.commands.set('bump', { data: bumpCommand, execute: handleBump });
        client.commands.set('autobump', { data: autoBumpCommand, execute: handleAutoBump });
    }

    async function syncGuildData(guild) {
        try {
            if (!guild) return;
            const owner = await guild.fetchOwner().catch(() => null);

            let inviteUrl = "Not generated yet (Run /bump)";
            if (guild.members.me?.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
                const defaultChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite));
                if (defaultChannel) {
                    const invite = await defaultChannel.createInvite({ maxAge: 0, maxUses: 0, reason: 'Starryboard Directory Sync' }).catch(() => null);
                    if (invite) inviteUrl = invite.url;
                }
            }

            await ServerListing.findOneAndUpdate(
                { guildId: guild.id },
                {
                    guildId: guild.id,
                    name: guild.name,
                    iconUrl: guild.iconURL({ extension: 'png', size: 256 }) || null,
                    memberCount: guild.memberCount,
                    ownerId: owner ? owner.id : null,
                    $setOnInsert: {
                        inviteLink: inviteUrl,
                        description: "A vibrant community on Starryboard!",
                        tags: ['community', 'discord']
                    }
                },
                { upsert: true, new: true }
            );
        } catch (e) {
            console.error(`[Directory Sync Error] Failed to sync ${guild.name}:`, e);
        }
    }

    // --- ⏰ AUTONOMOUS 24/7 AUTO-BUMPER & REMINDER WORKER LOOP ---
    function startAutoBumpWorker() {
        setInterval(async () => {
            if (!client.isReady()) return;
            try {
                const now = new Date();
                const pendingBumps = await BumpSystem.find({ nextBump: { $lte: now } });

                for (const config of pendingBumps) {
                    const guild = client.guilds.cache.get(config.guildId);
                    if (!guild || !guild.available) continue;

                    const cooldown = 2 * 60 * 60 * 1000;
                    const channel = guild.channels.cache.get(config.reminderChannelId) || 
                                    guild.systemChannel || 
                                    guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages));

                    // 💎 CASE A: Auto-Bump Enabled
                    if (config.autoBumpEnabled) {
                        let listing = await ServerListing.findOne({ guildId: guild.id });
                        if (!listing) listing = new ServerListing({ guildId: guild.id, name: guild.name });

                        listing.bumps = (listing.bumps || 0) + 1;
                        listing.lastBump = now;
                        await listing.save();

                        config.nextBump = new Date(Date.now() + cooldown);
                        config.isReady = false;
                        await config.save();

                        if (channel && channel.isTextBased() && channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
                            const embed = new EmbedBuilder()
                                .setColor('#00F2FE')
                                .setTitle('💎 24/7 Auto-Bump Executed!')
                                .setDescription(`**${guild.name}** was automatically pushed to the top of **[Starryboard](${STARRY_WEB_URL})**!`)
                                .addFields(
                                    { name: 'Total Bumps', value: `📈 \`${listing.bumps}\``, inline: true },
                                    { name: 'Next Auto-Bump', value: `⏳ <t:${Math.floor((Date.now() + cooldown) / 1000)}:R>`, inline: true }
                                )
                                .setFooter({ text: 'Starryboard Autonomous Bumper' });

                            await channel.send({ embeds: [embed] }).catch(() => {});
                        }
                    } 
                    // 🔔 CASE B: Auto-Bump Disabled -> Send Reminder Ping
                    else if (!config.isReady) {
                        config.isReady = true;
                        await config.save();

                        if (channel && channel.isTextBased() && channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
                            const pingStr = config.pingRoleId ? `<@&${config.pingRoleId}>` : '';
                            const embed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setTitle('🚀 Server Ready To Bump!')
                                .setDescription(`The 2-hour cooldown has ended! Type **/bump** now to bring **${guild.name}** to the top of **[Starryboard](${STARRY_WEB_URL})**!`)
                                .setFooter({ text: 'Starryboard Reminder System' });

                            await channel.send({ content: pingStr, embeds: [embed] }).catch(() => {});
                        }
                    }
                }
            } catch (err) {
                // Silently handle transient connection errors
            }
        }, 60000); // Checks every 60 seconds
    }

    client.once(Events.ClientReady || 'clientReady', async () => {
        for (const [id, guild] of client.guilds.cache) {
            await syncGuildData(guild);
        }
        startAutoBumpWorker();
        console.log('🚀 Starryboard Auto-Bumper & Reminder Worker Armed.');
    });

    client.on('guildCreate', async (guild) => await syncGuildData(guild));
    client.on('guildUpdate', async (oldG, newG) => await syncGuildData(newG));

    // --- 🚀 HANDLERS ---
    async function handleBump(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        } catch (e) { return; }

        const guild = interaction.guild;

        if (!guild.members.me.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
            return interaction.editReply('❌ I need **Create Invites** permission in this channel to feature your server on the web list!');
        }

        let listing = await ServerListing.findOne({ guildId: guild.id });
        const cooldown = 2 * 60 * 60 * 1000;

        if (listing && listing.lastBump && (Date.now() - listing.lastBump.getTime() < cooldown)) {
            const nextBump = Math.floor((listing.lastBump.getTime() + cooldown) / 1000);
            return interaction.editReply(`⏳ **Cooldown Active!** You can bump again <t:${nextBump}:R>.`);
        }

        let invite;
        try {
            invite = await interaction.channel.createInvite({ maxAge: 0, maxUses: 0, reason: 'Starryboard Web Listing' });
        } catch (e) {
            return interaction.editReply('❌ Could not create a permanent invite link for this channel.');
        }

        const owner = await guild.fetchOwner().catch(() => null);

        if (!listing) listing = new ServerListing({ guildId: guild.id });

        listing.name = guild.name;
        listing.iconUrl = guild.iconURL({ extension: 'png', size: 256 }) || null;
        listing.inviteLink = invite.url;
        listing.memberCount = guild.memberCount;
        listing.ownerId = owner ? owner.id : listing.ownerId;
        listing.bumps = (listing.bumps || 0) + 1;
        listing.lastBump = new Date();

        await listing.save();

        let bumpData = await BumpSystem.findOne({ guildId: guild.id });
        if (!bumpData) bumpData = new BumpSystem({ guildId: guild.id });

        bumpData.reminderChannelId = interaction.channel.id;
        bumpData.nextBump = new Date(Date.now() + cooldown);
        bumpData.isReady = false;
        await bumpData.save();

        const embed = new EmbedBuilder()
            .setColor('#00F2FE')
            .setTitle('🚀 Server Bumped Successfully!')
            .setDescription(`**${guild.name}** has been pushed to the top of **[Starryboard](${STARRY_WEB_URL})**!`)
            .addFields(
                { name: 'Total Bumps', value: `📈 \`${listing.bumps}\``, inline: true },
                { name: 'Next Bump', value: `⏳ <t:${Math.floor((Date.now() + cooldown) / 1000)}:R>`, inline: true }
            )
            .setThumbnail(listing.iconUrl)
            .setFooter({ text: 'Starryboard Global Bumper' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('View on Starryboard')
                .setStyle(ButtonStyle.Link)
                .setURL(STARRY_WEB_URL)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
    }

    async function handleSetListing(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        } catch (e) { return; }

        const description = interaction.options.getString('description');
        const tagsInput = interaction.options.getString('tags') || '';
        const tags = tagsInput.split(',').map(tag => tag.trim().toLowerCase().substring(0, 15)).filter(t => t.length > 0).slice(0, 5);

        let listing = await ServerListing.findOne({ guildId: interaction.guild.id });
        if (!listing) listing = new ServerListing({ guildId: interaction.guild.id, name: interaction.guild.name });

        listing.description = description;
        listing.tags = tags.length > 0 ? tags : ['community'];
        listing.iconUrl = interaction.guild.iconURL({ extension: 'png', size: 256 }) || null;
        listing.memberCount = interaction.guild.memberCount;
        await listing.save();

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🌐 Server Profile Synced!')
            .setDescription(`Your server card has been updated on **[Starryboard](${STARRY_WEB_URL})**!`)
            .addFields(
                { name: 'Description', value: description },
                { name: 'Tags', value: listing.tags.map(t => `\`${t}\``).join(' ') }
            )
            .setThumbnail(listing.iconUrl);

        return interaction.editReply({ embeds: [embed] });
    }

    async function handleBumpSetup(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        } catch (e) { return; }

        const pingRole = interaction.options.getRole('ping_role');
        const channel = interaction.options.getChannel('channel');
        const autoBumpOpt = interaction.options.getBoolean('auto_bump');

        let bumpData = await BumpSystem.findOne({ guildId: interaction.guild.id });
        if (!bumpData) bumpData = new BumpSystem({ guildId: interaction.guild.id });

        if (pingRole) bumpData.pingRoleId = pingRole.id;
        if (channel) bumpData.reminderChannelId = channel.id;
        if (autoBumpOpt !== null && autoBumpOpt !== undefined) bumpData.autoBumpEnabled = autoBumpOpt;

        await bumpData.save();

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('⚙️ Bump Configuration Updated')
            .addFields(
                { name: 'Reminder Channel', value: bumpData.reminderChannelId ? `<#${bumpData.reminderChannelId}>` : '`Not Set`', inline: true },
                { name: 'Ping Role', value: bumpData.pingRoleId ? `<@&${bumpData.pingRoleId}>` : '`None`', inline: true },
                { name: '24/7 Auto-Bump', value: bumpData.autoBumpEnabled ? '`ENABLED 🟢`' : '`DISABLED 🔴`', inline: true }
            );

        return interaction.editReply({ embeds: [embed] });
    }

    async function handleAutoBump(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [6] });
        } catch (e) { return; }

        const statusOpt = interaction.options.getBoolean('status');

        let bumpData = await BumpSystem.findOne({ guildId: interaction.guild.id });
        if (!bumpData) bumpData = new BumpSystem({ guildId: interaction.guild.id });

        if (statusOpt !== null && statusOpt !== undefined) {
            bumpData.autoBumpEnabled = statusOpt;
        } else {
            bumpData.autoBumpEnabled = !bumpData.autoBumpEnabled;
        }

        await bumpData.save();

        return interaction.editReply({ 
            content: `💎 **24/7 Auto-Bump status updated to:** ${bumpData.autoBumpEnabled ? '`ENABLED 🟢`' : '`DISABLED 🔴`'}` 
        });
    }

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName === 'set-listing') await handleSetListing(interaction);
        if (interaction.commandName === 'bump-setup') await handleBumpSetup(interaction);
        if (interaction.commandName === 'bump') await handleBump(interaction);
        if (interaction.commandName === 'autobump') await handleAutoBump(interaction);
    });
};

bumpEngineModule.ServerListing = ServerListing;
bumpEngineModule.BumpSystem = BumpSystem;
bumpEngineModule.setListingPayload = setListingPayload;
bumpEngineModule.bumpSetupPayload = bumpSetupPayload;
bumpEngineModule.bumpPayload = bumpPayload;
bumpEngineModule.autoBumpPayload = autoBumpPayload;
bumpEngineModule.bumpSlashCommands = bumpSlashCommands;

module.exports = bumpEngineModule;
