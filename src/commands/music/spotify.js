// ==========================================
// 🟢 SPOTIFY USER PLAYLISTS & ACCOUNT COMMAND
// File Path: src/commands/music/spotify.js
// Access Personal Spotify Accounts, Saved Playlists, Direct Voice Playback
// ==========================================
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags
} = require('discord.js');
const spotifyManager = require('../../modules/spotifyManager');
const { getPublicUrl } = require('../../utils/tunnelManager');
const config = require('../../config');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spotify')
        .setDescription('🟢 Access and play personal Spotify playlists & linked accounts')
        .addSubcommand(sub =>
            sub.setName('save')
                .setDescription('Save a Spotify playlist to your personal library')
                .addStringOption(opt => opt.setName('url').setDescription('Spotify playlist URL or ID').setRequired(true))
                .addStringOption(opt => opt.setName('name').setDescription('Custom nickname for this playlist (optional)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all your saved Spotify playlists')
        )
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Play one of your saved Spotify playlists in voice')
                .addStringOption(opt => opt.setName('playlist').setDescription('Playlist name or index number').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a playlist from your saved library')
                .addStringOption(opt => opt.setName('playlist').setDescription('Playlist name or index number').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('connect')
                .setDescription('Link your personal Spotify account with OAuth2')
        )
        .addSubcommand(sub =>
            sub.setName('myplaylists')
                .setDescription('Browse and play playlists from your linked Spotify account')
        )
        .addSubcommand(sub =>
            sub.setName('disconnect')
                .setDescription('Unlink your Spotify account from Starry')
        ),

    name: 'spotify',
    aliases: ['sp', 'spotifyplaylist', 'spotifysave', 'myplaylist'],
    category: 'Music',
    description: 'Access and play personal Spotify playlists or connect your Spotify account.',
    usage: ',spotify [save <url> [name] | list | play <name> | remove <name> | connect | myplaylists]',

    async execute(ctx, client) {
        // Normalize subcommands for both prefix (,spotify save ...) and slash (/spotify save ...)
        const isSlash = ctx.isSlash || Boolean(ctx.interaction);
        let sub = isSlash ? ctx.options.getSubcommand?.() : ctx.args[0]?.toLowerCase();
        let queryArgs = isSlash ? [] : ctx.args.slice(1);

        if (!sub || sub === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor('#1DB954')
                .setAuthor({ name: '🟢 Starry Spotify Integration', iconURL: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' })
                .setTitle('Personal Spotify Account & Playlists')
                .setDescription(
                    `Easily save, link, and stream your favorite Spotify playlists into Discord voice!\n\n` +
                    `📌 **Available Commands:**\n` +
                    `• \`,spotify save <url> [name]\` — Save any Spotify playlist to your quick library\n` +
                    `• \`,spotify list\` — View all your saved playlists with 1-click play buttons\n` +
                    `• \`,spotify play <name|#>\` — Instantly load and play your saved playlist in voice\n` +
                    `• \`,spotify remove <name|#>\` — Remove a playlist from your library\n` +
                    `• \`,spotify connect\` — Link your personal Spotify account for live sync\n` +
                    `• \`,spotify myplaylists\` — Browse & play live playlists from your linked account\n` +
                    `• \`,spotify disconnect\` — Unlink your Spotify account\n\n` +
                    `*You can also click the 🟢 **My Spotify** button in the Music Controller channel!*`
                )
                .setFooter({ text: 'Starry Hi-Fi Audio Engine • Spotify API Certified' });

            return ctx.reply({ embeds: [helpEmbed] });
        }

        // 1. SAVE PLAYLIST
        if (sub === 'save' || sub === 'add') {
            const url = isSlash ? ctx.options.getString('url', true) : queryArgs[0];
            const customName = isSlash ? ctx.options.getString('name') : queryArgs.slice(1).join(' ');

            if (!url) {
                return ctx.reply('❌ Please provide a Spotify playlist URL. Example: `,spotify save https://open.spotify.com/playlist/... my-favorites`');
            }

            await ctx.defer();
            try {
                const res = await spotifyManager.savePlaylist(ctx.user.id, url, customName);
                const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setAuthor({ name: '🟢 Spotify Playlist Saved', iconURL: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' })
                    .setTitle(`✅ Saved: ${res.finalName}`)
                    .setURL(res.playlist.url)
                    .setThumbnail(res.playlist.imageUrl || null)
                    .setDescription(
                        `📚 **Tracks:** \`${res.playlist.trackCount}\` songs\n` +
                        `🔖 **Nickname:** \`${res.finalName}\`\n` +
                        `🗂️ **Total Saved Playlists:** \`${res.totalSaved}\`\n\n` +
                        `▶️ **How to Play:** Type \`,spotify play ${res.finalName}\``
                    )
                    .setFooter({ text: 'Starry Spotify Library' });

                return ctx.reply({ embeds: [embed] });
            } catch (err) {
                return ctx.reply(`❌ Could not save Spotify playlist: \`${err.message}\``);
            }
        }

        // 2. LIST PLAYLISTS
        if (sub === 'list' || sub === 'saved') {
            await ctx.defer();
            const data = await spotifyManager.getUserPlaylists(ctx.user.id);

            if (!data.savedPlaylists.length && !data.oauthPlaylists.length) {
                const emptyEmbed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle('🟢 Your Spotify Library is Empty')
                    .setDescription(
                        `You haven't saved any Spotify playlists yet!\n\n` +
                        `✨ **Get Started:**\n` +
                        `• Save any playlist with: \`,spotify save <playlist_url> [custom_name]\`\n` +
                        `• Or connect your full Spotify account with: \`,spotify connect\``
                    );
                return ctx.reply({ embeds: [emptyEmbed] });
            }

            const embed = new EmbedBuilder()
                .setColor('#1DB954')
                .setAuthor({ name: `${ctx.user.username}'s Spotify Library`, iconURL: data.avatarUrl || ctx.user.displayAvatarURL() })
                .setTitle(`📚 Saved & Linked Spotify Playlists (${data.savedPlaylists.length + data.oauthPlaylists.length})`);

            let desc = '';
            const options = [];

            if (data.savedPlaylists.length > 0) {
                desc += `### 📁 Personal Saved Playlists\n`;
                data.savedPlaylists.forEach((p, idx) => {
                    desc += `**${idx + 1}.** [${p.name}](${p.url}) • \`${p.trackCount} tracks\` (Play: \`,spotify play ${idx + 1}\`)\n`;
                    if (options.length < 25) {
                        options.push({
                            label: p.name.substring(0, 45),
                            description: `${p.trackCount} tracks • Saved playlist`,
                            value: `play_sp_${p.url}`,
                            emoji: '🎵'
                        });
                    }
                });
                desc += '\n';
            }

            if (data.oauthPlaylists.length > 0) {
                desc += `### 🟢 Linked Account Playlists\n`;
                data.oauthPlaylists.slice(0, 10).forEach((p, idx) => {
                    desc += `• [${p.name}](${p.url}) • \`${p.trackCount} tracks\` (${p.isPublic ? 'Public' : 'Private'})\n`;
                    if (options.length < 25) {
                        options.push({
                            label: p.name.substring(0, 45),
                            description: `${p.trackCount} tracks • Account playlist`,
                            value: `play_sp_${p.url}`,
                            emoji: '🟢'
                        });
                    }
                });
            }

            embed.setDescription(desc);
            embed.setFooter({ text: 'Select a playlist from the dropdown below to play it in voice!' });

            const components = [];
            if (options.length > 0) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId('spotify_play_select')
                    .setPlaceholder('▶️ Select a playlist to play in voice...')
                    .addOptions(options);
                components.push(new ActionRowBuilder().addComponents(menu));
            }

            return ctx.reply({ embeds: [embed], components });
        }

        // 3. PLAY SAVED PLAYLIST
        if (sub === 'play') {
            const identifier = isSlash ? ctx.options.getString('playlist', true) : queryArgs.join(' ');
            if (!identifier) {
                return ctx.reply('❌ Please specify which saved playlist you want to play. Example: `,spotify play chill` or `,spotify play 1`');
            }

            const voiceChannel = ctx.member?.voice?.channel;
            if (!voiceChannel) {
                return ctx.reply('❌ You must join a voice channel first to play a Spotify playlist!');
            }

            await ctx.defer();
            const data = await spotifyManager.getUserPlaylists(ctx.user.id);
            let targetUrl = null;
            let playlistName = identifier;

            // Check if user specified 1-based index
            const num = parseInt(identifier, 10);
            if (!isNaN(num) && num >= 1 && num <= data.savedPlaylists.length) {
                targetUrl = data.savedPlaylists[num - 1].url;
                playlistName = data.savedPlaylists[num - 1].name;
            } else {
                // Search by name in saved playlists
                const found = data.savedPlaylists.find(p => p.name.toLowerCase() === identifier.toLowerCase() || p.name.toLowerCase().includes(identifier.toLowerCase()));
                if (found) {
                    targetUrl = found.url;
                    playlistName = found.name;
                } else if (data.oauthPlaylists.length > 0) {
                    // Search in linked account playlists
                    const oauthFound = data.oauthPlaylists.find(p => p.name.toLowerCase() === identifier.toLowerCase() || p.name.toLowerCase().includes(identifier.toLowerCase()));
                    if (oauthFound) {
                        targetUrl = oauthFound.url;
                        playlistName = oauthFound.name;
                    }
                }
            }

            // If user passed a direct spotify URL
            if (!targetUrl && identifier.includes('spotify.com/playlist/')) {
                targetUrl = identifier;
            }

            if (!targetUrl) {
                return ctx.reply(`❌ Could not find any saved playlist matching \`${identifier}\`. Type \`,spotify list\` to see your saved playlists.`);
            }

            try {
                const res = await spotifyManager.playPlaylist(client, ctx.guild, voiceChannel, ctx.channel, targetUrl, ctx.user);
                const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle(`🟢 Streaming Spotify Playlist: ${res.title}`)
                    .setDescription(
                        `📚 Loaded **${res.trackCount}** tracks into <#${voiceChannel.id}>\n` +
                        `👤 **Requester:** ${ctx.user}\n\n` +
                        `*Use \`,queue\` to view all songs or manage playback in the music controller!*`
                    )
                    .setFooter({ text: 'Starry Hi-Fi Audio Engine' });

                return ctx.reply({ embeds: [embed] });
            } catch (err) {
                return ctx.reply(`❌ Failed to stream Spotify playlist: \`${err.message}\``);
            }
        }

        // 4. REMOVE SAVED PLAYLIST
        if (sub === 'remove' || sub === 'delete') {
            const identifier = isSlash ? ctx.options.getString('playlist', true) : queryArgs.join(' ');
            if (!identifier) {
                return ctx.reply('❌ Please specify which playlist to remove. Example: `,spotify remove 1` or `,spotify remove my-playlist`');
            }

            const res = await spotifyManager.removePlaylist(ctx.user.id, identifier);
            if (!res.success) {
                return ctx.reply(res.message);
            }

            return ctx.reply(`✅ Removed playlist **${res.removedPlaylist.name}** from your library. You have **${res.remainingCount}** saved playlist${res.remainingCount === 1 ? '' : 's'} remaining.`);
        }

        // 5. CONNECT SPOTIFY ACCOUNT (OAuth2)
        if (sub === 'connect' || sub === 'login' || sub === 'link') {
            const port = process.env.PORT || 10000;
            const publicUrl = getPublicUrl() || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
            const redirectUri = `${publicUrl}/api/spotify/callback`;
            const authUrl = spotifyManager.getOAuthUrl(ctx.user.id, redirectUri);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Connect Spotify Account')
                    .setStyle(ButtonStyle.Link)
                    .setURL(authUrl)
                    .setEmoji('🟢')
            );

            const embed = new EmbedBuilder()
                .setColor('#1DB954')
                .setAuthor({ name: '🟢 Connect Your Spotify Account', iconURL: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' })
                .setTitle('Authorize Starry to Access Your Playlists')
                .setDescription(
                    `Click the secure button below to link your Spotify account.\n\n` +
                    `✨ **What you unlock:**\n` +
                    `• Direct 1-click access to all your **private and public playlists**\n` +
                    `• Seamless streaming from your Spotify library into Discord voice\n` +
                    `• 100% encrypted & secure authentication\n\n` +
                    `*This link is exclusively for ${ctx.user} and expires in 10 minutes.*`
                )
                .setFooter({ text: 'Starry Security • Official Spotify OAuth2' });

            return ctx.reply({ embeds: [embed], components: [row], flags: [EPHEMERAL_FLAG] });
        }

        // 6. BROWSE LINKED ACCOUNT PLAYLISTS
        if (sub === 'myplaylists' || sub === 'account') {
            await ctx.defer();
            const data = await spotifyManager.getUserPlaylists(ctx.user.id);

            if (!data.isLinked) {
                return ctx.reply('⚠️ You have not connected your Spotify account yet! Use `,spotify connect` to link your account.');
            }

            if (!data.oauthPlaylists.length) {
                return ctx.reply('🟢 No playlists found on your connected Spotify account.');
            }

            const embed = new EmbedBuilder()
                .setColor('#1DB954')
                .setTitle(`🟢 ${data.displayName}'s Spotify Account Playlists`)
                .setDescription(
                    data.oauthPlaylists.slice(0, 15).map((p, i) => 
                        `**${i + 1}.** [${p.name}](${p.url}) • \`${p.trackCount} tracks\` (${p.isPublic ? '🌐 Public' : '🔒 Private'})`
                    ).join('\n')
                )
                .setFooter({ text: 'Use the dropdown below to play any playlist directly!' });

            const options = data.oauthPlaylists.slice(0, 25).map(p => ({
                label: p.name.substring(0, 45),
                description: `${p.trackCount} tracks • ${p.isPublic ? 'Public' : 'Private'}`,
                value: `play_sp_${p.url}`,
                emoji: '🟢'
            }));

            const menu = new StringSelectMenuBuilder()
                .setCustomId('spotify_play_select')
                .setPlaceholder('▶️ Choose a playlist to stream...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(menu);
            return ctx.reply({ embeds: [embed], components: [row] });
        }

        // 7. DISCONNECT
        if (sub === 'disconnect' || sub === 'unlink') {
            const UserSpotify = require('../../models/UserSpotify');
            await UserSpotify.findOneAndUpdate(
                { userId: ctx.user.id },
                { $unset: { accessToken: 1, refreshToken: 1, spotifyId: 1, displayName: 1 } }
            );
            return ctx.reply('👋 Successfully unlinked your Spotify account. Your saved offline playlists remain in your library.');
        }

        return ctx.reply(`❌ Unknown subcommand \`${sub}\`. Type \`,spotify\` for help.`);
    }
};
