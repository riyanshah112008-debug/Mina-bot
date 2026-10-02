const db = require("../utils/database");
const { dispatchStaffAlert } = require("../modules/verification/videoVerify");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild || oldState.guild;
    const cfg = db.getVideoVerificationConfig(guild.id);
    if (!cfg.enabled || !cfg.waitingVoiceId) return;

    // Detect member joining the waiting room VC
    const joinedWaitingRoom = !oldState.channelId && newState.channelId === cfg.waitingVoiceId;
    const switchedToWaitingRoom = oldState.channelId !== cfg.waitingVoiceId && newState.channelId === cfg.waitingVoiceId;

    if (joinedWaitingRoom || switchedToWaitingRoom) {
      const activeSession = db.getActiveVideoVerificationForUser(guild.id, member.id);
      if (!activeSession) {
        const sessionId = `VV-${Date.now().toString().slice(-6)}`;
        db.createVideoVerificationSession(sessionId, {
          guildId: guild.id,
          userId: member.id,
          username: member.user.tag || member.user.username,
        });

        await dispatchStaffAlert(guild, member.user, member, sessionId, client);
      }
    }

    // Detect camera turned on in verification VC
    const isVerifyVc = newState.channelId === cfg.verifyVoiceId || newState.channelId === cfg.waitingVoiceId;
    if (isVerifyVc && !oldState.selfVideo && newState.selfVideo) {
      const session = db.getActiveVideoVerificationForUser(guild.id, member.id);
      if (session) {
        db.updateVideoVerificationSession(session.id, { hasCameraOn: true });
      }
    }
  },
};
