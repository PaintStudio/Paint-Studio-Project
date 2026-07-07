import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusCritBoost extends Effect {
  static ID = 209;
  modifyCritRate(value, { owner, attacker }) {
    if (owner.id !== attacker.id) return;
    return value + (this.params[0] || 0.2);
  }
}

registerEffect(StatusCritBoost);
mapStatus('crit_boost_status', 209);
