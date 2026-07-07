import { Effect, registerEffect } from '../../effectSystem';

class StatDebuff extends Effect {
  static ID = 402;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (this.params[0] !== stat) return;
    return Math.round(value * (1 - this.params[1]));
  }
}

registerEffect(StatDebuff);
