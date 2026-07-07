import { Effect, registerEffect } from '../../effectSystem';

// 방어력 감소 + 공격받으면 공격자 노트 감소
// args: [defReduce, noteSteal]  예) [0.5, 1]
class DefDownNoteSteal extends Effect {
  static ID = 177;

  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'def') return;
    return Math.round(value * (1 - (this.params[0] || 0.5)));
  }

  onTakeDamage({ owner, unit, attacker }) {
    if (owner.id !== unit.id) return;
    if (!attacker) return;
    const steal = this.params[1] || 1;
    return {
      enemyNoteReduce: [{ targetId: attacker.id, amount: steal }],
      log: `  [에스큘럼의 활보자] ${attacker.name}: 턴 노트 -${steal}`,
    };
  }
}

registerEffect(DefDownNoteSteal);
