import { Effect, registerEffect, mapStatus } from '../../effectSystem';

// 받는 피해 감소
// params: [reductionRatio]  예) [0.45]
class StatusDamageReduction extends Effect {
  static ID = 213;
  calcDamageReduction(value, { owner, defender }) {
    if (owner.id !== defender.id) return;
    return value + (this.params[0] || 0);
  }
}

registerEffect(StatusDamageReduction);
mapStatus('damage_reduction', 213);
