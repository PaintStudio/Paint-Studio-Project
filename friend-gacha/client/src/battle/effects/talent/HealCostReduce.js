import { Effect, registerEffect, mapType } from '../../effectSystem';

class HealCostReduce extends Effect {
  static ID = 142;
  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type === 'heal') return Math.max(1, value - this.params[0]);
  }
}

registerEffect(HealCostReduce);
mapType('heal_cost_reduce', 142);
