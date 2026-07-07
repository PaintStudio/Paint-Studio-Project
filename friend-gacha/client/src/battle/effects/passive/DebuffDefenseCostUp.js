import { Effect, registerEffect, mapType } from '../../effectSystem';

class DebuffDefenseCostUp extends Effect {
  static ID = 12;
  modifyEnemyDefCost(value, { enemy }) {
    if (enemy?.debuffs?.length > 0) return value + this.params[0];
  }
}

registerEffect(DebuffDefenseCostUp);
mapType('debuff_defense_cost_up', 12);
