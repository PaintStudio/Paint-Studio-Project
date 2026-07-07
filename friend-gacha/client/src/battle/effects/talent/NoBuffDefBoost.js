import { Effect, registerEffect, getBuffs } from '../../effectSystem';

// 버프가 없을 때 방어력 증가
// args: [defBoost]  예) [1.0]
class NoBuffDefBoost extends Effect {
  static ID = 170;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'def') return;
    if (getBuffs(unit.id).length > 0) return;
    return Math.round(value * (1 + (this.params[0] || 1.0)));
  }
}

registerEffect(NoBuffDefBoost);
