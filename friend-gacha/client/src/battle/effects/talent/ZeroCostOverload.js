import { Effect, registerEffect } from '../../effectSystem';

class ZeroCostOverload extends Effect {
  static ID = 183;
  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    return Math.max(0, value - (skill?.cost || 0));
  }
  modifyOverloadInc(value, { owner, unit }) {
    if (owner.id !== unit.id) return;
    return this.params[0] || 3;
  }
}

registerEffect(ZeroCostOverload);
