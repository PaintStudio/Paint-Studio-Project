import { Effect, registerEffect } from '../../effectSystem';

// 치유 스킬 치유량 증가 + 자신이 받는 치유량 감소
// args: [healBoost, selfNerf]  예) [0.5, 0.5]
class HealBoostSelfNerf extends Effect {
  static ID = 168;

  modifyHealAmount(value, { owner, caster, target }) {
    let modified = false;
    if (owner.id === caster?.id) {
      value = Math.round(value * (1 + (this.params[0] || 0.5)));
      modified = true;
    }
    if (owner.id === target?.id) {
      value = Math.round(value * (1 - (this.params[1] || 0.5)));
      modified = true;
    }
    if (modified) return value;
  }
}

registerEffect(HealBoostSelfNerf);
