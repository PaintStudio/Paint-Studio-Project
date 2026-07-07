import { Effect, registerEffect, mapType } from '../../effectSystem';

class StatBoostPassive extends Effect {
  static ID = 16;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    const targetStat = this.params[0];
    const boost = this.params[1];
    const myStat = targetStat === 'hp' ? 'maxHp' : targetStat;
    if (stat !== myStat) return;
    return Math.round(value * (1 + boost));
  }
}

registerEffect(StatBoostPassive);
mapType('stat_boost', 16);
