// ==========================================
// 🟢 STARRY SPOTIFY INTEGRATION ENGINE
// File Path: src/modules/spotifyManager.js
// Access Personal Spotify Accounts, Saved Playlists, OAuth2 Sync & Instant Voice Enqueue
// ==========================================
const fetch = require('node-fetch');
const spotifyUrlInfo = require('spotify-url-info')(fetch);
const UserSpotify = require('../models/UserSpotify');
const { StarryAudioEngine } = require('../utils/nativeAudioEngine');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '4bb67b7dfc094233a07c29e8f6b4751f';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'a746a92237184c3abf71db9241334d01';

class SpotifyManager {
    constructor() {
        this.appToken = null;
        this.appTokenExpires = 0;
    }

    async getAppToken() {
        if (this.appToken && Date.now() < this.appTokenExpires - 60000) {
            return this.appToken;
        }
        try {
            const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
            const res = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${creds}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });
            const data = await res.json();
            if (data.access_token) {
                this.appToken = data.access_token;
                this.appTokenExpires = Date.now() + ((data.expires_in || 3600) * 1000);
                return this.appToken;
            }
        } catch (err) {
            console.warn('⚠️ [SpotifyManager] Error obtaining client credentials token:', err.message);
        }
        return null;
    }

    getOAuthUrl(userId, redirectUri) {
        const scopes = [
            'playlist-read-private',
            'playlist-read-collaborative',
            'user-read-private',
            'user-top-read',
            'user-library-read'
        ].join(' ');

        const params = new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: scopes,
            state: userId,
            show_dialog: 'true'
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    async handleOAuthCallback(code, redirectUri, stateUserId) {
        if (!code || !stateUserId) throw new Error('Missing authorization code or user state.');

        const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${creds}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri
            }).toString()
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain access token from Spotify.');
        }

        // Fetch User Profile
        const profRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        const profile = await profRes.json();

        const expiresAt = new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000));

        const userDoc = await UserSpotify.findOneAndUpdate(
            { userId: stateUserId },
            {
                spotifyId: profile.id || '',
                displayName: profile.display_name || profile.id || 'Spotify User',
                profileUrl: profile.external_urls?.spotify || `https://open.spotify.com/user/${profile.id}`,
                avatarUrl: profile.images?.[0]?.url || '',
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || '',
                tokenExpiresAt: expiresAt,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        return { userDoc, profile };
    }

    async refreshUserToken(userDoc) {
        if (!userDoc || !userDoc.refreshToken) return null;
        try {
            const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
            const res = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${creds}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: userDoc.refreshToken
                }).toString()
            });
            const data = await res.json();
            if (data.access_token) {
                userDoc.accessToken = data.access_token;
                userDoc.tokenExpiresAt = new Date(Date.now() + ((data.expires_in || 3600) * 1000));
                if (data.refresh_token) userDoc.refreshToken = data.refresh_token;
                await userDoc.save();
                return userDoc.accessToken;
            }
        } catch (e) {
            console.warn('⚠️ [SpotifyManager] Refresh token failed:', e.message);
        }
        return null;
    }

    async fetchPlaylistDetails(urlOrId) {
        let cleanUrl = urlOrId.trim();
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://open.spotify.com/playlist/${cleanUrl}`;
        }

        try {
            const data = await spotifyUrlInfo.getData(cleanUrl);
            if (data) {
                return {
                    id: data.id || cleanUrl.split('/playlist/')[1]?.split('?')[0] || 'spotify-playlist',
                    name: data.name || data.title || 'My Spotify Playlist',
                    url: cleanUrl,
                    trackCount: Array.isArray(data.trackList) ? data.trackList.length : 0,
                    imageUrl: data.coverArt?.sources?.[0]?.url || data.thumbnail || 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=500&q=80',
                    tracks: (data.trackList || []).map(t => ({
                        title: t.title || t.name,
                        author: t.subtitle || (Array.isArray(t.artists) ? t.artists.map(a => a.name).join(', ') : 'Various Artists'),
                        duration: t.duration || 0
                    }))
                };
            }
        } catch (scraperErr) {
            // Fallback to Official API if scraper hits rate-limit or edge case
            const token = await this.getAppToken();
            const idMatch = cleanUrl.match(/playlist\/([a-zA-Z0-9]+)/);
            if (token && idMatch) {
                const playlistId = idMatch[1];
                const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    return {
                        id: json.id,
                        name: json.name,
                        url: cleanUrl,
                        trackCount: json.tracks?.total || 0,
                        imageUrl: json.images?.[0]?.url || '',
                        tracks: (json.tracks?.items || []).map(i => ({
                            title: i.track?.name || 'Unknown Track',
                            author: (i.track?.artists || []).map(a => a.name).join(', '),
                            duration: i.track?.duration_ms || 0
                        }))
                    };
                }
            }
        }

        throw new Error('Could not fetch Spotify playlist metadata. Please verify the playlist link is public.');
    }

    async savePlaylist(userId, playlistUrl, customName = null) {
        const details = await this.fetchPlaylistDetails(playlistUrl);
        const nameToUse = customName ? customName.trim() : details.name;

        let userDoc = await UserSpotify.findOne({ userId });
        if (!userDoc) {
            userDoc = new UserSpotify({ userId, savedPlaylists: [] });
        }

        // Check if playlist already exists
        const existingIdx = userDoc.savedPlaylists.findIndex(p => p.url === details.url || p.name.toLowerCase() === nameToUse.toLowerCase());
        if (existingIdx !== -1) {
            userDoc.savedPlaylists[existingIdx] = {
                id: details.id,
                name: nameToUse,
                url: details.url,
                trackCount: details.trackCount,
                imageUrl: details.imageUrl,
                addedAt: new Date()
            };
        } else {
            userDoc.savedPlaylists.push({
                id: details.id,
                name: nameToUse,
                url: details.url,
                trackCount: details.trackCount,
                imageUrl: details.imageUrl,
                addedAt: new Date()
            });
        }

        userDoc.updatedAt = new Date();
        await userDoc.save();

        return { playlist: details, finalName: nameToUse, totalSaved: userDoc.savedPlaylists.length };
    }

    async removePlaylist(userId, identifier) {
        const userDoc = await UserSpotify.findOne({ userId });
        if (!userDoc || !userDoc.savedPlaylists.length) {
            return { success: false, message: 'You have no saved Spotify playlists.' };
        }

        const cleanId = identifier.trim().toLowerCase();
        let targetIdx = -1;

        // Check if index number (1, 2, 3...)
        const num = parseInt(cleanId, 10);
        if (!isNaN(num) && num >= 1 && num <= userDoc.savedPlaylists.length) {
            targetIdx = num - 1;
        } else {
            targetIdx = userDoc.savedPlaylists.findIndex(p => 
                p.name.toLowerCase() === cleanId || 
                p.id.toLowerCase() === cleanId ||
                p.url.toLowerCase().includes(cleanId)
            );
        }

        if (targetIdx === -1) {
            return { success: false, message: `Could not find any saved playlist matching \`${identifier}\`.` };
        }

        const removed = userDoc.savedPlaylists.splice(targetIdx, 1)[0];
        userDoc.updatedAt = new Date();
        await userDoc.save();

        return { success: true, removedPlaylist: removed, remainingCount: userDoc.savedPlaylists.length };
    }

    async getUserPlaylists(userId) {
        const userDoc = await UserSpotify.findOne({ userId });
        const result = {
            isLinked: Boolean(userDoc && userDoc.accessToken),
            displayName: userDoc?.displayName || '',
            profileUrl: userDoc?.profileUrl || '',
            avatarUrl: userDoc?.avatarUrl || '',
            savedPlaylists: userDoc?.savedPlaylists || [],
            oauthPlaylists: []
        };

        // If user linked via OAuth, fetch live Spotify account playlists
        if (userDoc && userDoc.accessToken) {
            let token = userDoc.accessToken;
            if (userDoc.tokenExpiresAt && new Date() >= userDoc.tokenExpiresAt) {
                token = await this.refreshUserToken(userDoc);
            }

            if (token) {
                try {
                    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=25', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const json = await res.json();
                        result.oauthPlaylists = (json.items || []).map(p => ({
                            id: p.id,
                            name: p.name,
                            url: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
                            trackCount: p.tracks?.total || 0,
                            imageUrl: p.images?.[0]?.url || '',
                            isPublic: Boolean(p.public),
                            owner: p.owner?.display_name || 'You'
                        }));
                    }
                } catch (e) {
                    console.warn('⚠️ [SpotifyManager] Error fetching OAuth playlists:', e.message);
                }
            }
        }

        return result;
    }

    async playPlaylist(client, guild, voiceChannel, textChannel, playlistUrl, user) {
        const manager = client.manager;
        const hasLavalink = manager && Array.from(manager.shoukaku?.nodes?.values() || []).some(n => n.state === 1);

        if (hasLavalink) {
            let player = manager.getPlayer(guild.id);
            if (!player) {
                player = await manager.createPlayer({
                    guildId: guild.id,
                    voiceId: voiceChannel.id,
                    textId: textChannel.id,
                    deaf: true,
                    shardId: guild.shardId || 0
                });
            }

            if (player.voiceId !== voiceChannel.id) {
                player.setVoiceChannel(voiceChannel.id);
            }
            player.textId = textChannel.id;

            const res = await manager.search(playlistUrl, { requester: user });
            if (!res || !res.tracks || res.tracks.length === 0) {
                throw new Error('Lavalink could not resolve Spotify tracks. Please ensure the playlist is public.');
            }

            for (const t of res.tracks) player.queue.add(t);
            const isPlaying = player.playing || player.paused;
            if (!isPlaying) {
                await player.play().catch(e => console.error('Player play error:', e));
            }

            return {
                title: res.playlistName || 'Spotify Playlist',
                trackCount: res.tracks.length,
                tracks: res.tracks
            };
        }

        // Native Audio Engine fallback
        const player = StarryAudioEngine.getOrCreatePlayer(client, guild.id, voiceChannel, textChannel);
        await player.connect().catch(() => {});

        const res = await StarryAudioEngine.search(playlistUrl, user);
        if (!res || !res.tracks || res.tracks.length === 0) {
            throw new Error('Could not load tracks from Spotify playlist.');
        }

        for (const t of res.tracks) player.queue.push(t);
        if (!player.currentTrack) {
            await player.playNext();
        }

        return {
            title: res.playlistName || 'Spotify Playlist',
            trackCount: res.tracks.length,
            tracks: res.tracks
        };
    }
}

const spotifyManager = new SpotifyManager();
module.exports = spotifyManager;
