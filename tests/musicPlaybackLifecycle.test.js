const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const native = read('src/utils/nativeAudioEngine.js');
const music = read('src/music.js');
const commands = read('src/commands.js');

test('NovaBot announces Now Playing only after Discord confirms audio is Playing', () => {
  const play = native.indexOf('this.player.play(this.audioResource)');
  const playing = native.indexOf('await entersState(this.player, AudioPlayerStatus.Playing, 15000)');
  const panel = native.indexOf('await this.sendNowPlayingPanel(track, true)');
  assert.ok(play >= 0 && playing > play && panel > playing);
});

test('NovaBot advances each failed track only once', () => {
  assert.match(native, /this\._endedTrack === expectedTrack/);
  assert.match(native, /handleTrackEnd\(expectedTrack = this\.currentTrack\)/);
});

test('NovaBot searches Spotify, YouTube, SoundCloud, Deezer and Apple Music', () => {
  for (const marker of [
    'spotifyEngine.searchTracks(query, 5)',
    'play.search(query, { limit: 5 })',
    "play.search(query, { source: { soundcloud: 'tracks' }, limit: 5 })",
    'api.deezer.com/search',
    'itunes.apple.com/search'
  ]) assert.ok(native.includes(marker), marker);
});

test('NovaBot command adapter does not publish a premature Now Playing embed', () => {
  assert.ok(!music.includes('buildNowPlayingPayload(first)'));
  assert.ok(music.includes('Now Playing panel will appear after audio is confirmed'));
  assert.ok(commands.includes('interaction:i'));
});

test('NovaBot autocomplete merges the native provider catalogue', () => {
  assert.ok(music.includes('NovaBotAudioEngine.search(focused,interaction.user)'));
  assert.ok(music.includes('track.sourceName||track.source'));
});
