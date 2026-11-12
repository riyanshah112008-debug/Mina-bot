'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createMusicManager: createNovaBotMusicManager } = require('./utils/musicManager');
const { NovaBotAudioEngine } = require('./utils/nativeAudioEngine');
function createMusicManager(client) {
  const manager = createNovaBotMusicManager(client);
  manager.client = client;
  return manager;
}
function fmt(ms){if(!ms||!Number.isFinite(Number(ms)))return 'LIVE';const s=Math.floor(Number(ms)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function trackEmbed(track,player){const e=new EmbedBuilder().setColor(0x5865F2).setTitle(String(track?.title||'Unknown track').slice(0,240)).setURL(track?.uri||'https://discord.com').setDescription('**Artist:** '+String(track?.author||'Unknown').slice(0,150)+'\n**Duration:** '+(track?.isStream?'LIVE':fmt(track?.length))+'\n**Queue:** '+(player?.queue?.length||0)+' upcoming\n**Volume:** '+(player?.volume||100)+'% · **Loop:** '+(player?.loop||'none'));if(track?.thumbnail)e.setThumbnail(track.thumbnail);if(track?.requester?.username)e.setFooter({text:'Requested by '+track.requester.username});return e;}
function controlRows(){return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mina_music_pause').setLabel('Pause').setEmoji('⏸️').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('mina_music_skip').setLabel('Skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('mina_music_loop').setLabel('Loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('mina_music_stop').setLabel('Stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger)),new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mina_music_shuffle').setLabel('Shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('mina_music_vol_down').setLabel('Vol −').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('mina_music_vol_up').setLabel('Vol +').setStyle(ButtonStyle.Secondary))];}
function guard(ctx){const v=ctx.member?.voice?.channel;if(!v)return {error:'❌ Join a voice channel first.'};const me=ctx.guild?.members?.me;if(me&&!v.permissionsFor(me)?.has(['Connect','Speak']))return {error:'❌ I need Connect and Speak permissions.'};return {voice:v};}
function getPlayer(manager,guildId){return manager?.getPlayer?.(guildId)||NovaBotAudioEngine.getPlayer(guildId,manager?.client)||null;}
function isNativePlayer(p){return Boolean(p&&Array.isArray(p.queue)&&typeof p.playNext==='function');}
async function play(ctx,manager,query){
 const g=guard(ctx); if(g.error)return ctx.reply(g.error);
 query=String(query||'').trim(); if(!query)return ctx.reply('Usage: ,play <song or URL>');
 let loading=null;
 if(ctx.isInteraction) await ctx.deferReply();
 else loading=await ctx.reply('🔎 Searching for **'+query.slice(0,100)+'**…').catch(()=>null);
 const sendResult=payload=>ctx.isInteraction?ctx.editReply(payload):(loading?loading.edit(payload):ctx.reply(payload));
 const hasReadyNode=Boolean(manager?.shoukaku && [...manager.shoukaku.nodes.values()].some(n=>n.state===1));
 if(hasReadyNode){
  try{
   let result=await manager.search(query,{requester:ctx.user});
   if(!result?.tracks?.length&&!/^https?:\/\//i.test(query))result=await manager.search('ytsearch:'+query,{requester:ctx.user});
   if(result?.tracks?.length){
    const p=manager.getPlayer(ctx.guild.id)||await manager.createPlayer({guildId:ctx.guild.id,voiceId:g.voice.id,textId:ctx.channel.id,deaf:true,volume:100});
    if(p.voiceId!==g.voice.id)await p.setVoiceChannel(g.voice.id);
    p.textId=ctx.channel.id;p.queue.add(result.tracks.slice(0,50));
    if(!p.playing&&!p.paused)await p.play();
    return sendResult({embeds:[trackEmbed(result.tracks[0],p)]});
   }
  }catch(error){console.warn('[NovaBot/NovaBot Music] Lavalink route failed; switching to native audio:',error.message||error);}
 }
 // Exact NovaBot native audio fallback: no Lavalink node is needed for this route.
 try{
  const result=await NovaBotAudioEngine.search(query,ctx.user);
  if(!result?.tracks?.length)return sendResult('❌ No playable results found for that song.');
  const native=NovaBotAudioEngine.getOrCreatePlayer(manager?.client||ctx.guild.client,ctx.guild.id,g.voice,ctx.channel);
  native.voiceChannel=g.voice;native.textChannel=ctx.channel;native.loadingMessage=loading;
  native.queue.push(...result.tracks);
  if(!native.currentTrack)native.playNext().catch(error=>console.warn('[NovaBot/NovaBot Native Audio] Playback error:',error.message||error));
  const first=result.tracks[0];
  const payload=native.buildNowPlayingPayload(first)||{embeds:[trackEmbed({title:first.title,author:first.author,uri:first.url,length:first.duration,thumbnail:first.thumbnail,requester:first.requester},native)]};
  return sendResult(payload);
 }catch(error){
  console.error('[NovaBot/NovaBot Native Audio] Search/play failed:',error);
  return sendResult('❌ NovaBot audio could not resolve this track. Try another title or direct YouTube/SoundCloud link.');
 }
}
async function execute(ctx,manager,action,value){
 let p=getPlayer(manager,ctx.guild?.id);
 if(action==='play'||action==='search')return play(ctx,manager,value);
 if(action==='join'){
  const g=guard(ctx);if(g.error)return ctx.reply(g.error);
  if(!p||isNativePlayer(p)){
   p=NovaBotAudioEngine.getOrCreatePlayer(manager?.client||ctx.guild.client,ctx.guild.id,g.voice,ctx.channel);
   p.voiceChannel=g.voice;p.textChannel=ctx.channel;await p.connect();
  }else{
   if(p.voiceId!==g.voice.id)await p.setVoiceChannel(g.voice.id);
  }
  return ctx.reply('👋 Joined <#'+g.voice.id+'>.');
 }
 if(!p)return ctx.reply(action==='queue'?'The music queue is empty.':'❌ No active music session.');
 const native=isNativePlayer(p);
 const current=native?p.currentTrack:p.queue?.current;
 const upcoming=native?p.queue:p.queue?.toArray?.()||p.queue||[];
 if(action==='queue'){
  const rows=upcoming.slice(0,10).map((t,i)=>(i+1)+'. **'+String(t.title).slice(0,80)+'** · '+fmt(native?t.duration:t.length));
  return ctx.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('🎵 Music Queue').setDescription('**Now Playing:** '+(current?.title||'Nothing')+'\n\n**Up Next:**\n'+(rows.join('\n')||'No upcoming tracks.'))]});
 }
 if(action==='nowplaying'||action==='np')return current?ctx.reply(native?p.buildNowPlayingPayload(current):{embeds:[trackEmbed(current,p)]}):ctx.reply('Nothing is playing.');
 const voiceId=native?p.voiceChannel?.id:p.voiceId;
 if(ctx.member?.voice?.channelId!==voiceId)return ctx.reply('Join NovaBot’s voice channel to control playback.');
 if(native){
  if(action==='pause'){p.pause(true);return ctx.reply('⏸️ Paused.');}
  if(action==='resume'){p.pause(false);return ctx.reply('▶️ Resumed.');}
  if(action==='skip'){p.skip();return ctx.reply('⏭️ Skipped.');}
  if(action==='stop'){p.stop();p.destroy();return ctx.reply('⏹️ Stopped and cleared.');}
  if(action==='volume'){const n=Number(value);if(!Number.isFinite(n)||n<0||n>200)return ctx.reply('Usage: ,volume <0-200>');p.setVolume(n);return ctx.reply('🔊 Volume: '+n+'%.');}
  if(action==='loop'){const m=String(value||'none').toLowerCase();if(!['none','off','track','queue'].includes(m))return ctx.reply('Usage: ,loop <off|track|queue>');p.loop=m==='off'?'none':m;return ctx.reply('🔁 Loop: '+m+'.');}
  if(action==='shuffle'){p.shuffle();return ctx.reply('🔀 Shuffled.');}
  if(action==='clear'){const n=p.clearQueue();return ctx.reply('🧹 Cleared '+n+' upcoming tracks.');}
  if(action==='remove'){const n=Number(value);const t=p.remove(n);return ctx.reply(t?'Removed '+t.title+'.':'Usage: ,remove <position>');}
  if(action==='jump'){const n=Number(value);return p.jump(n)?ctx.reply('⏭️ Jumped to position '+n+'.'):ctx.reply('Usage: ,jump <position>');}
  if(action==='seek'){const s=Number(value);if(!Number.isFinite(s)||s<0||s*1000>(current?.duration||0))return ctx.reply('Usage: ,seek <seconds>');const ok=await p.seekTo(s);return ctx.reply(ok?'⏩ Seeked to '+fmt(s*1000)+'.':'❌ This source does not support seeking.');}
  if(action==='replay')return ctx.reply(p.replay()?'🔁 Replaying current track.':'Nothing is playing.');
  if(action==='previous')return ctx.reply(p.previous()?'⏮️ Playing previous track.':'No previous track available.');
  if(action==='filter'){const k=String(value||'clear').toLowerCase();const allowed=['clear','flat','empowering','bass','8d','nightcore','daycore','vaporwave','lofi','reverb','karaoke','surround','electronic','soft','radio','treble','pop'];if(!allowed.includes(k))return ctx.reply('Unknown filter. Try ,filter bass, nightcore, 8d or lofi.');await p.setFilter(k);return ctx.reply('🎧 Filter: '+k+'.');}
  if(action==='speed'){const n=Number(value);if(!Number.isFinite(n)||n<0.5||n>2)return ctx.reply('Usage: ,speed <0.5-2>');await p.setFilter(n>1?'nightcore':n<1?'daycore':'clear');return ctx.reply('⏩ Native engine uses the matching '+(n>1?'nightcore':n<1?'daycore':'normal')+' speed profile.');}
  if(action==='autoplay'){p.autoplay=!p.autoplay;return ctx.reply('📻 Autoplay '+(p.autoplay?'enabled':'disabled')+'.');}
 }
 if(action==='pause'){await p.pause(true);return ctx.reply('⏸️ Paused.');}
 if(action==='resume'){await p.pause(false);return ctx.reply('▶️ Resumed.');}
 if(action==='skip'){await p.skip();return ctx.reply('⏭️ Skipped.');}
 if(action==='stop'){await p.destroy();return ctx.reply('⏹️ Stopped and cleared.');}
 if(action==='volume'){const n=Math.max(0,Math.min(150,Number(value)));if(!Number.isFinite(n))return ctx.reply('Usage: ,volume <0-150>');await p.setVolume(n);return ctx.reply('🔊 Volume: '+n+'%.');}
 if(action==='loop'){const m=String(value||'none').toLowerCase();if(!['none','off','track','queue'].includes(m))return ctx.reply('Usage: ,loop <off|track|queue>');await p.setLoop(m==='off'?'none':m);return ctx.reply('🔁 Loop: '+m+'.');}
 if(action==='shuffle'){p.queue.shuffle();return ctx.reply('🔀 Shuffled.');}
 if(action==='clear'){p.queue.clear();return ctx.reply('🧹 Queue cleared.');}
 if(action==='remove'){const n=Number(value)-1;if(!Number.isInteger(n)||n<0||n>=p.queue.length)return ctx.reply('Usage: ,remove <position>');const t=p.queue[n];p.queue.remove(t);return ctx.reply('Removed '+t.title+'.');}
 if(action==='jump'){const n=Number(value)-1;if(!Number.isInteger(n)||n<0||n>=p.queue.length)return ctx.reply('Usage: ,jump <position>');await p.skip(n+1);return ctx.reply('⏭️ Jumped to position '+(n+1)+'.');}
 if(action==='seek'){const s=Number(value);if(!Number.isFinite(s)||s<0||s*1000>(p.queue.current?.length||0))return ctx.reply('Usage: ,seek <seconds>');await p.seek(s*1000);return ctx.reply('⏩ Seeked to '+fmt(s*1000)+'.');}
 if(action==='replay'){await p.seek(0);return ctx.reply('🔁 Replaying current track.');}
 if(action==='previous'){const t=p.data.get('previousTrack');if(!t)return ctx.reply('No previous track available.');p.queue.unshift(t);await p.skip();return ctx.reply('⏮️ Playing previous track.');}
 if(action==='filter'){const k=String(value||'clear').toLowerCase();const filters={clear:{},bass:{equalizer:[{band:0,gain:.25},{band:1,gain:.25},{band:2,gain:.15}]},nightcore:{timescale:{speed:1.25,pitch:1.25,rate:1}},daycore:{timescale:{speed:.85,pitch:.85,rate:1}},'8d':{rotation:{rotationHz:.2}},vaporwave:{timescale:{speed:.8,pitch:.8,rate:1}},lofi:{lowPass:{smoothing:16}},karaoke:{karaoke:{level:1,monoLevel:1,filterBand:220,filterWidth:100}}};if(!filters[k])return ctx.reply('Unknown filter.');await p.shoukaku.setFilters(filters[k]);p.data.set('activeFilter',k);return ctx.reply('🎧 Filter: '+k+'.');}
 if(action==='speed'){const n=Number(value);if(!Number.isFinite(n)||n<.5||n>2)return ctx.reply('Usage: ,speed <0.5-2>');await p.shoukaku.setFilters({timescale:{speed:n,pitch:n,rate:1}});return ctx.reply('⏩ Speed: '+n+'x.');}
 if(action==='autoplay'){const n=!p.data.get('autoplay');p.data.set('autoplay',n);return ctx.reply('📻 Autoplay '+(n?'enabled':'disabled')+'.');}
 return ctx.reply('Unknown music command. Try ,musichelp.');
}
function context(m){return {isInteraction:false,guild:m.guild,member:m.member,channel:m.channel,user:m.author,reply:x=>m.reply(x)};}
async function handlePrefix(message,client){if(!message.guild||message.author.bot||!message.content)return false;const prefix=process.env.PREFIX||',';const content=message.content.trim();const used=[...new Set([prefix,',','.'])].sort((a,b)=>b.length-a.length).find(x=>x&&content.toLowerCase().startsWith(x.toLowerCase()));if(!used)return false;const args=content.slice(used.length).trim().split(/\s+/),raw=(args.shift()||'').toLowerCase();const aliases={p:'play',add:'play',np:'nowplaying',prev:'previous',back:'previous',summon:'join',connect:'join',vol:'volume',q:'queue',repeat:'loop',next:'skip',dc:'stop',find:'search'};const action=aliases[raw]||raw;const valid=['play','pause','resume','skip','stop','queue','nowplaying','volume','loop','shuffle','clear','remove','jump','replay','previous','join','search','autoplay','filter','speed','seek','help'];if(!valid.includes(action))return false;if(action==='help')return message.reply('🎵 **NovaBot Music**\n,play <song/URL> · ,pause · ,resume · ,skip · ,stop · ,queue · ,nowplaying\n,volume <0-150> · ,loop <off/track/queue> · ,shuffle · ,remove <position> · ,clear · ,jump <position> · ,seek <seconds> · ,filter <name> · ,speed <0.5-2>');return execute(context(message),client.manager,action,args.join(' '));}
async function handleButton(i,client){
 if(!i.customId.startsWith('mina_music_'))return false;
 const a=i.customId.slice(11),p=getPlayer(client.manager,i.guildId);
 if(!p)return i.reply({content:'No active music session.',ephemeral:true});
 const native=isNativePlayer(p),voiceId=native?p.voiceChannel?.id:p.voiceId;
 if(i.member?.voice?.channelId!==voiceId)return i.reply({content:'Join the player voice channel to use controls.',ephemeral:true});
 await i.deferUpdate();
 if(native){
  if(a==='pause')p.pause(!p.paused);
  if(a==='skip')p.skip();
  if(a==='stop'){p.stop();p.destroy();}
  if(a==='shuffle')p.shuffle();
  if(a==='loop')p.loop=p.loop==='none'?'track':p.loop==='track'?'queue':'none';
  if(a==='vol_down')p.setVolume(Math.max(0,(p.volume||100)-10));
  if(a==='vol_up')p.setVolume(Math.min(200,(p.volume||100)+10));
  return true;
 }
 if(a==='pause')await p.pause(!p.paused);
 if(a==='skip')await p.skip();
 if(a==='stop')await p.destroy();
 if(a==='shuffle')p.queue.shuffle();
 if(a==='loop')await p.setLoop(p.loop==='none'?'track':p.loop==='track'?'queue':'none');
 if(a==='vol_down')await p.setVolume(Math.max(0,(p.volume||100)-10));
 if(a==='vol_up')await p.setVolume(Math.min(150,(p.volume||100)+10));
 return true;
}
async function autocomplete(interaction,client){
 const focused=String(interaction.options.getFocused()||'').trim();
 if(focused.length<2)return interaction.respond([]);
 try{
  const hasReadyNode=Boolean(client.manager?.shoukaku&&[...client.manager.shoukaku.nodes.values()].some(n=>n.state===1));
  let tracks=[];
  if(hasReadyNode){const result=await client.manager.search(focused,{requester:interaction.user});tracks=result?.tracks||[];}
  if(!tracks.length){const result=await NovaBotAudioEngine.search(focused,interaction.user);tracks=result?.tracks||[];}
  const choices=tracks.slice(0,25).map(track=>({name:[track.title,track.author].filter(Boolean).join(' — ').slice(0,100)||'Unknown track',value:String(track.uri||track.url||[track.author,track.title].filter(Boolean).join(' - ')||focused).slice(0,100)}));
  return interaction.respond(choices);
 }catch(error){console.warn('[NovaBot/NovaBot Music] Autocomplete failed:',error.message||error);return interaction.respond([]);}
}
module.exports={createMusicManager,execute,handlePrefix,handleButton,autocomplete,trackEmbed,controlRows};
