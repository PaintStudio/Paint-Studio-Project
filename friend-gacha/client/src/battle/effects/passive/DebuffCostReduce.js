import { Effect, registerEffect, mapType } from '../../effectSystem';

class DebuffCostReduce extends Effect {
  static ID = 7;
  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type === 'debuff') return Math.max(1, value - this.params[0]);
  }
}

registerEffect(DebuffCostReduce);
mapType('debuff_cost_reduce', 7);
