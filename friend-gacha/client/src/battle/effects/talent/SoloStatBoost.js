import { Effect, registerEffect } from '../../effectSystem';

class SoloStatBoost extends Effect {
  static ID = 184;
  modifyStat(value, { owner, unit, stat, party }) {
    if (owner.id !== unit.id) return;
    const aliveOthers = (party || []).filter(u => u.alive && u.id !== owner.id).length;
    if (aliveOthers > 0) return;
    const boost = this.params[0] || 1;
    if (stat === 'atk' || stat === 'def' || stat === 'maxHp' || stat === 'maxNotes') {
      return Math.round(value * (1 + boost));
    }
  }
}

registerEffect(SoloStatBoost);
