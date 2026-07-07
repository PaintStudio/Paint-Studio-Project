import { Effect, registerEffect } from '../../effectSystem';

class ElementTypeCostReduce extends Effect {
  static ID = 191;
  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    const element = this.params[0] || 'water';
    const type = this.params[1] || 'support';
    const reduce = this.params[2] || 1;
    if (skill?.element !== element) return;
    if (skill?.type !== type) return;
    return Math.max(0, value - reduce);
  }
}

registerEffect(ElementTypeCostReduce);
