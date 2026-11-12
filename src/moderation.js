'use strict';

const store = require('./store');

function canActOnTarget(actor, target, botMember) {
  if (!actor || !target || !botMember) return { ok: false, reason: 'Could not resolve the actor, target, or bot member.' };
  if (target.id === target.guild.ownerId) return { ok: false, reason: 'The server owner cannot be moderated.' };
  if (actor.id !== target.guild.ownerId && target.roles.highest.position >= actor.roles.highest.position) {
    return { ok: false, reason: 'Your highest role must be above the target member.' };
  }
  if (target.roles.highest.position >= botMember.roles.highest.position) {
    return { ok: false, reason: 'Move NovaBot role above the target member.' };
  }
  return { ok: true };
}

function addWarning(guildId, userId, moderatorId, reason) {
  let warning;
  store.update(guildId, cfg => {
    cfg.warnings ||= [];
    warning = {
      id: (cfg.nextCaseId = (Number(cfg.nextCaseId) || 0) + 1),
      userId,
      moderatorId,
      reason: String(reason || 'No reason provided').slice(0, 400),
      at: new Date().toISOString()
    };
    cfg.warnings.push(warning);
    cfg.warnings = cfg.warnings.slice(-500);
  });
  return warning;
}

function getWarnings(guildId, userId) {
  return (store.get(guildId).warnings || []).filter(item => item.userId === userId && item.type !== 'warnings-cleared');
}

function clearWarnings(guildId, userId, moderatorId) {
  let removed = 0;
  store.update(guildId, cfg => {
    cfg.warnings ||= [];
    const before = cfg.warnings.length;
    cfg.warnings = cfg.warnings.filter(item => item.userId !== userId);
    removed = before - cfg.warnings.length;
    if (removed) {
      cfg.warnings.push({
        id: (cfg.nextCaseId = (Number(cfg.nextCaseId) || 0) + 1),
        userId,
        moderatorId,
        reason: 'Cleared ' + removed + ' warning(s)',
        at: new Date().toISOString(),
        type: 'warnings-cleared'
      });
      cfg.warnings = cfg.warnings.slice(-500);
    }
  });
  return removed;
}

module.exports = { canActOnTarget, addWarning, getWarnings, clearWarnings };
