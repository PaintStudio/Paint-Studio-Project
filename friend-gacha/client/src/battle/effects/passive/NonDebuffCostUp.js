import { Effect, registerEffect, mapType } from '../../effectSystem';

class NonDebuffCostUp extends Effect {
  static ID = 8;
  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'debuff') return value + this.params[0];
  }
}

registerEffect(NonDebuffCostUp);
mapType('non_debuff_cost_up', 8);
