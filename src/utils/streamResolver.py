#!/usr/bin/env python3
import os
import sys
import json
import glob
import time
try:
    import yt_dlp
except ImportError:
    import subprocess
    try:
        # Attempt auto-installation for cloud hosts (Render, Railway, Heroku)
        cmd = [sys.executable, "-m", "pip", "install", "yt-dlp", "--quiet", "--no-warn-script-location", "--break-system-packages"]
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        import yt_dlp
    except Exception:
        # Gracefully step aside without throwing an unhandled traceback
        print('UNAVAILABLE', flush=True)
        sys.exit(0)

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.audio_cache'))
os.makedirs(CACHE_DIR, exist_ok=True)

try:
    now = time.time()
    for f in os.listdir(CACHE_DIR):
        fpath = os.path.join(CACHE_DIR, f)
        if os.path.isfile(fpath) and (now - os.path.getmtime(fpath) > 3 * 86400):
            try: os.remove(fpath)
            except: pass
except:
    pass

ydl_track_opts = {
    'format': 'ba/b',
    'quiet': True,
    'no_warnings': True,
    'noplaylist': True,
    'default_search': 'ytsearch1',
    'outtmpl': os.path.join(CACHE_DIR, '%(id)s.%(ext)s'),
    'extractor_args': {'youtube': {'player_client': ['android']}},
    'socket_timeout': 10
}

ydl_playlist_opts = {
    'extract_flat': True,
    'quiet': True,
    'no_warnings': True,
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
    'socket_timeout': 12
}

ydl_track = yt_dlp.YoutubeDL(ydl_track_opts)
ydl_playlist = yt_dlp.YoutubeDL(ydl_playlist_opts)
print('READY', flush=True)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req_id = None
    try:
        req = json.loads(line)
        req_id = req.get('id')
        action = req.get('action', 'resolve')

        if action == 'resolve_playlist':
            url = req.get('url', '')
            info = ydl_playlist.extract_info(url, download=False)
            if info:
                pl_title = info.get('title') or 'Online Playlist'
                pl_author = info.get('uploader') or info.get('channel') or 'Curator'
                thumbs = info.get('thumbnails') or []
                pl_thumb = thumbs[-1].get('url') if thumbs else None
                
                raw_entries = info.get('entries') or []
                tracks = []
                for entry in raw_entries:
                    if not entry:
                        continue
                    vid_id = entry.get('id')
                    track_url = f'https://www.youtube.com/watch?v={vid_id}' if vid_id else entry.get('url')
                    if not track_url and vid_id:
                        track_url = f'https://www.youtube.com/watch?v={vid_id}'
                    
                    e_thumbs = entry.get('thumbnails') or []
                    e_thumb = e_thumbs[-1].get('url') if e_thumbs else pl_thumb
                    
                    tracks.append({
                        'title': entry.get('title') or 'Unknown Title',
                        'author': entry.get('uploader') or entry.get('channel') or pl_author,
                        'duration': int((entry.get('duration') or 180) * 1000),
                        'url': track_url,
                        'thumbnail': e_thumb,
                        'source': 'YouTube Playlist'
                    })
                
                resp = {
                    'id': req_id,
                    'status': 'ok',
                    'title': pl_title,
                    'author': pl_author,
                    'thumbnail': pl_thumb,
                    'tracks': tracks
                }
            else:
                resp = {'id': req_id, 'status': 'error', 'message': 'Could not extract playlist information'}

        else:
            query = req.get('query', '')

            if 'youtube.com' in query or 'youtu.be' in query:
                target = query
            else:
                target = f'ytsearch1:{query}'

            info = ydl_track.extract_info(target, download=True)
            if 'entries' in info:
                entries = info['entries']
                video = entries[0] if entries else None
            else:
                video = info

            if video:
                vid_id = video.get('id')
                matching = glob.glob(os.path.join(CACHE_DIR, f'{vid_id}.*'))
                filepath = matching[0] if matching else ydl_track.prepare_filename(video)

                if os.path.exists(filepath) and os.path.getsize(filepath) > 10000:
                    resp = {
                        'id': req_id,
                        'status': 'ok',
                        'file': filepath,
                        'title': video.get('title'),
                        'duration': video.get('duration')
                    }
                else:
                    resp = {'id': req_id, 'status': 'error', 'message': 'Audio file empty or missing'}
            else:
                resp = {'id': req_id, 'status': 'error', 'message': 'No audio format found'}
    except Exception as e:
        resp = {'id': req_id, 'status': 'error', 'message': str(e)}

    print(json.dumps(resp), flush=True)
