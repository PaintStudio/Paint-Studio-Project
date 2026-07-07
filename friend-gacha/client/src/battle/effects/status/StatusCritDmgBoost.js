import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusCritDmgBoost extends Effect {
  static ID = 210;
  modifyCritMult(value, { owner, attacker }) {
    if (owner.id !== attacker.id) return;
    return value + (this.params[0] || 0.15);
  }
}

registerEffect(StatusCritDmgBoost);
mapStatus('crit_dmg_boost', 210);
