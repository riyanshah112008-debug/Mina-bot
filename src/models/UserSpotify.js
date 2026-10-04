const mongoose = require('mongoose');

/**
 * UserSpotify Schema
 * Stores user-linked Spotify account credentials, OAuth2 tokens,
 * and user-saved personal Spotify playlists.
 */
const SavedPlaylistSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    trackCount: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    addedAt: { type: Date, default: Date.now }
});

const UserSpotifySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true }, // Discord User Snowflake
    spotifyId: { type: String, default: '' },
    displayName: { type: String, default: '' },
    profileUrl: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    tokenExpiresAt: { type: Date, default: null },
    savedPlaylists: [SavedPlaylistSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.UserSpotify || mongoose.model('UserSpotify', UserSpotifySchema);
