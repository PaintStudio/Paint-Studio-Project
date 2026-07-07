import { Effect, registerEffect } from '../../effectSystem';

// 받는 피해 감소 + 기록, 사이클 개시 시 기록의 일부를 피해로 수령
// args: [damageReduce, consumeRatio, damageRatio]  예) [0.5, 0.5, 1.5]
class DreamwingDamageDelay extends Effect {
  static ID = 176;

  calcDamageReduction(value, { owner, defender }) {
    if (owner.id !== defender.id) return;
    return value + (this.params[0] || 0.5);
  }

  onTakeDamage({ owner, unit, damage }) {
    if (owner.id !== unit.id) return;
    this.state._delayedDmg = (this.state._delayedDmg || 0) + damage;
  }

  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const stored = this.state._delayedDmg || 0;
    if (stored <= 0) return;
    const consumeRatio = this.params[1] || 0.5;
    const dmgRatio = this.params[2] || 1.5;
    const consumed = Math.round(stored * consumeRatio);
    this.state._delayedDmg = stored - consumed;
    const dmg = Math.round(consumed * dmgRatio);
    if (dmg <= 0) return;
    return {
      selfDamage: dmg,
      log: `  [몽상 중인 클리어윙] ${unit.name}: 기록 ${consumed} 소모 → ${dmg} 피해`,
    };
  }
}

registerEffect(DreamwingDamageDelay);
