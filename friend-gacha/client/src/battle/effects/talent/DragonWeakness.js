import { Effect, registerEffect } from '../../effectSystem';

// 최대 HP 감소 + 궁극기 쿨다운 감소
// args: [hpReduction, cdReduce]  예) [0.5, 3]
class DragonWeakness extends Effect {
  static ID = 167;

  onFirstCycle({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const hpReduce = this.params[0] || 0.5;
    return {
      maxHpReduce: hpReduce,
      log: `  [힘을 잃은 거룡] ${unit.name}: 최대 HP ${Math.round(hpReduce * 100)}% 감소`,
    };
  }

  modifyBaseCooldown(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'ultimate') return;
    const cdReduce = this.params[1] || 3;
    return Math.max(1, value - cdReduce);
  }
}

registerEffect(DragonWeakness);
