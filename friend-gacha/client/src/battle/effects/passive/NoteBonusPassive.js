import { Effect, registerEffect, mapType } from '../../effectSystem';

class NoteBonusPassive extends Effect {
  static ID = 17;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'maxNotes') return;
    return value + this.params[0];
  }
}

registerEffect(NoteBonusPassive);
mapType('note_bonus', 17);
