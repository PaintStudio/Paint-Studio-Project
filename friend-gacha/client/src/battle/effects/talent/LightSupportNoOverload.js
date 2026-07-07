import { Effect, registerEffect } from '../../effectSystem';

class LightSupportNoOverload extends Effect {
  static ID = 195;
  modifyOverloadInc(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.element !== 'light' || skill?.type !== 'support') return;
    return 0;
  }
}

registerEffect(LightSupportNoOverload);
