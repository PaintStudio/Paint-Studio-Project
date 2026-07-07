import { Effect, registerEffect, mapType } from '../../effectSystem';

class ElementBuffCostReduce extends Effect {
  static ID = 139;
  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'buff') return;
    const elem = skill.element;
    const allowed = this.params[0] || ['light', 'water'];
    if (allowed.includes(elem)) return Math.max(1, value - this.params[1]);
  }
}

registerEffect(ElementBuffCostReduce);
mapType('element_buff_cost_reduce', 139);
