import { Effect, registerEffect } from '../../effectSystem';

class LightAllyAtkStack extends Effect {
  static ID = 198;
  onPostSkill({ owner, unit }) {
    if (!owner.alive) return;
    if (unit.isEnemy) return;
    if (unit.element !== 'light') return;
    const max = this.params[1] || 300;
    const cur = this.state._atkBoostPercent || 0;
    if (cur >= max) return;
    const inc = this.params[0] || 10;
    this.state._atkBoostPercent = Math.min(max, cur + inc);
    return { log: `  [양자의 지휘자] ${owner.name}: 공격력 +${this.state._atkBoostPercent}%` };
  }
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'atk') return;
    const boost = (this.state._atkBoostPercent || 0) / 100;
    if (boost <= 0) return;
    return Math.round(value * (1 + boost));
  }
}

registerEffect(LightAllyAtkStack);
