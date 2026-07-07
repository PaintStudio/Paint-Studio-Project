import { Effect, registerEffect, mapType } from '../../effectSystem';

class OriginStacks extends Effect {
  static ID = 130;
  modifyDamageDealt(value, { owner, attacker }) {
    if (owner.id !== attacker.id) return;
    if (this.getStack(attacker, '_originStacks') > 0) {
      return Math.round(value * (1 + this.params[0]));
    }
  }
  onBuffApplied({ owner, target }) {
    if (target.id !== owner.id || !this.params[1]) return;
    const cur = this.getStack(target, '_originStacks');
    return {
      combatStackUpdates: { _originStacks: cur + this.params[1] },
      log: `  [천의] ${target.name} 근원 ${cur + this.params[1]}스택`
    };
  }
}

registerEffect(OriginStacks);
mapType('origin_stacks', 130);
