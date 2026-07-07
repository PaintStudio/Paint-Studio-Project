import { Effect, registerEffect, mapType } from '../../effectSystem';

class NextAllyCrit extends Effect {
  static ID = 153;
  onSkillUsed({ owner, unit }) {
    if (owner.id !== unit.id) return;
    return {
      combatStackUpdates: { _futureVisionActive: 1 },
    };
  }
  modifyCritRate(value, { owner, attacker }) {
    if (owner.id === attacker.id) return;
    if ((attacker.combatStacks || {})._futureVisionBoosted > 0) return value + (this.params[0] || 0.33);
  }
}

registerEffect(NextAllyCrit);
mapType('next_ally_crit', 153);
