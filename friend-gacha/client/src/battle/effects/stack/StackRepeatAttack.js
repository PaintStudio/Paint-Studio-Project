import { Effect, registerEffect, mapStack } from '../../effectSystem';

// 앵콜(반복 공격): 이 유닛이 피격 시 공격자에게 1회 추가 공격 트리거
// params: [현재 스택 수]
class StackRepeatAttack extends Effect {
  static ID = 502;

  onTakeDamage({ owner, unit, damage, attacker }) {
    if (owner.id !== unit.id) return;
    if (!attacker || attacker.isEnemy === owner.isEnemy) return;
    if (damage <= 0) return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return {
      repeatAttack: { attackerId: attacker.id, defenderId: owner.id },
      combatStackUpdates: { _encoreStacks: stacks - 1 },
      log: `  [앵콜] ${owner.name}: 공격 반복! (스택 ${stacks - 1} 남음)`,
    };
  }
}

registerEffect(StackRepeatAttack);
mapStack('_encoreStacks', 502);
