import { Effect, registerEffect, mapType } from '../../effectSystem';

class AttackTrackTaunt extends Effect {
  static ID = 137;
  onSkillUsed({ owner, unit, skill, targetId }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'attack' && skill.type !== 'ultimate') return;
    const cs = unit.combatStacks || {};
    const lastTarget = cs._attackTrackTarget;
    const count = (lastTarget === targetId) ? (cs._attackTrackCount || 0) + 1 : 1;
    const updates = { _attackTrackTarget: targetId, _attackTrackCount: count };
    if (count >= this.params[0]) {
      const taunt = (cs._tauntStacks || 0) + 1;
      updates._tauntStacks = taunt;
      updates._attackTrackCount = 0;
      return {
        combatStackUpdates: updates,
        log: `  [${unit.talent.name}] ${this.params[0]}회 공격 → 도발 ${taunt}스택`
      };
    }
    return { combatStackUpdates: updates };
  }
}

registerEffect(AttackTrackTaunt);
mapType('attack_track_taunt', 137);
