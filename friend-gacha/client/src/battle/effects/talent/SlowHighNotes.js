import { Effect, registerEffect } from '../../effectSystem';

class SlowHighNotes extends Effect {
  static ID = 199;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat === 'spd') return Math.round(value * (1 - (this.params[0] || 0.8)));
    if (stat === 'maxNotes') return value + (this.params[1] || 10);
  }
}

registerEffect(SlowHighNotes);
