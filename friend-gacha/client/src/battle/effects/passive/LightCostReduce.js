import { Effect, registerEffect, mapType } from '../../effectSystem';

class LightCostReduce extends Effect {
  static ID = 6;
  modifyCost(value, { owner, unit, skill, skillElem }) {
    if (owner.id !== unit.id) return;
    if ((skill?.element || skillElem) === 'light') return Math.max(1, value - this.params[0]);
  }
}

registerEffect(LightCostReduce);
mapType('light_cost_reduce', 6);
