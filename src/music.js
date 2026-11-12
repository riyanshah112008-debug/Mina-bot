'use strict';
const { EmbedBuilder } = require('discord.js');
const { QueueRepeatMode } = require('discord-player');
const spotify = require('./spotify');
function queueOf(player,guildId){return player.nodes.get(guildId);}
function requireVoice(interaction){const voice=interaction.member?.voice?.channel;if(!voice)return {error:'Join a voice channel first.'};const me=interaction.guild.members.me;if(me&&voice.permissionsFor(me)&&!voice.permissionsFor(me).has(['Connect','Speak']))return {error:'I need Connect and Speak permissions in your voice channel.'};return {voice};}
function trackEmbed(track,title='Now playing'){return new EmbedBuilder().setColor(0x5865F2).setTitle(title).setDescription('['+track.title+']('+track.url+')').addFields({name:'Artist / source',value:String(track.author||'Unknown').slice(0,100),inline:true},{name:'Duration',value:track.duration||'Live',inline:true}).setThumbnail(track.thumbnail||null).setFooter({text:'Requested by '+(track.requestedBy?.username||'Mina')});}
async function play(interaction,player,query){
 const v=requireVoice(interaction);if(v.error)return interaction.reply({content:v.error,ephemeral:true});await interaction.deferReply();
 try{
  if(/open\.spotify\.com\/(track|playlist)\//i.test(query)){const parsed=await spotify.resolve(query),requests=parsed.type==='track'?[parsed.track]:parsed.tracks;if(!requests.length)return interaction.editReply('No tracks found in that Spotify link.');const first=requests.shift();const result=await player.play(v.voice,first.name+' '+first.artists.join(' '),{requestedBy:interaction.user,nodeOptions:{metadata:{channel:interaction.channel}}});for(const track of requests.slice(0,49))await player.play(v.voice,track.name+' '+track.artists.join(' '),{requestedBy:interaction.user,nodeOptions:{metadata:{channel:interaction.channel}}});return interaction.editReply({embeds:[trackEmbed(result.track,'Added from Spotify')],content:requests.length?'Spotify playlist tracks added to the queue.':''});}
  const result=await player.play(v.voice,query,{requestedBy:interaction.user,nodeOptions:{metadata:{channel:interaction.channel}}});return interaction.editReply({embeds:[trackEmbed(result.track,'Added to queue')]});
 }catch(error){console.error('[Music] Play failed:',error);return interaction.editReply('I could not find or play that track. Try a different search or link.');}
}
async function control(interaction,player,action,value){
 const queue=queueOf(player,interaction.guildId);if(!queue)return interaction.reply({content:'Nothing is playing in this server.',ephemeral:true});
 if(action==='pause'){if(queue.node.isPaused())return interaction.reply({content:'Playback is already paused.',ephemeral:true});queue.node.pause();return interaction.reply('⏸️ Playback paused.');}
 if(action==='resume'){if(!queue.node.isPaused())return interaction.reply({content:'Playback is not paused.',ephemeral:true});queue.node.resume();return interaction.reply('▶️ Playback resumed.');}
 if(action==='skip'){const current=queue.currentTrack;if(!current)return interaction.reply({content:'Nothing is playing.',ephemeral:true});queue.node.skip();return interaction.reply('⏭️ Skipped **'+current.title+'**.');}
 if(action==='stop'){queue.delete();return interaction.reply('⏹️ Playback stopped and the queue was cleared.');}
 if(action==='volume'){const volume=Math.max(0,Math.min(100,value));queue.node.setVolume(volume);return interaction.reply('🔊 Volume set to **'+volume+'%**.');}
 if(action==='loop'){const modes={off:QueueRepeatMode.OFF,track:QueueRepeatMode.TRACK,queue:QueueRepeatMode.QUEUE};queue.setRepeatMode(modes[value]);return interaction.reply('🔁 Repeat mode: **'+value+'**.');}
 if(action==='shuffle'){queue.tracks.shuffle();return interaction.reply('🔀 Queue shuffled.');}
 if(action==='remove'){const tracks=queue.tracks.toArray(),track=tracks[value-1];if(!track)return interaction.reply({content:'That queue position does not exist.',ephemeral:true});queue.removeTrack(track);return interaction.reply('Removed **'+track.title+'** from the queue.');}
 if(action==='clear'){queue.tracks.clear();return interaction.reply('Queue cleared. The current track will finish.');}
}
async function showQueue(interaction,player){const q=queueOf(player,interaction.guildId);if(!q)return interaction.reply({content:'The music queue is empty.',ephemeral:true});const upcoming=q.tracks.toArray().slice(0,10),current=q.currentTrack;const lines=upcoming.map((t,i)=>(i+1)+'. ['+t.title+']('+t.url+') · '+t.duration);const embed=new EmbedBuilder().setColor(0x5865F2).setTitle('Music queue').setDescription((current?'**Now:** ['+current.title+']('+current.url+')\n\n':'')+(lines.join('\n')||'No upcoming tracks.')).setFooter({text:upcoming.length+' upcoming track(s)'});return interaction.reply({embeds:[embed]});}
async function nowPlaying(interaction,player){const q=queueOf(player,interaction.guildId);if(!q?.currentTrack)return interaction.reply({content:'Nothing is playing.',ephemeral:true});return interaction.reply({embeds:[trackEmbed(q.currentTrack)]});}
function bindEvents(player){player.events.on('playerStart',(queue,track)=>{const channel=queue.metadata?.channel;if(channel?.send)channel.send({embeds:[trackEmbed(track)]}).catch(()=>null);});player.events.on('emptyQueue',queue=>{const channel=queue.metadata?.channel;if(channel?.send)channel.send('✅ Queue finished.').catch(()=>null);});player.events.on('playerError',(queue,error)=>console.error('[Music] Player error:',error));player.events.on('error',(queue,error)=>console.error('[Music] Queue error:',error));}
module.exports={play,control,showQueue,nowPlaying,bindEvents};
