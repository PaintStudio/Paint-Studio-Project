import { Effect, registerEffect, mapType } from '../../effectSystem';

class CritBoost extends Effect {
  static ID = 4;
  modifyCritRate(value, { owner, attacker }) {
    if (owner.id !== attacker.id) return;
    return value + this.params[0];
  }
}

registerEffect(CritBoost);
mapType('crit_boost', 4);
