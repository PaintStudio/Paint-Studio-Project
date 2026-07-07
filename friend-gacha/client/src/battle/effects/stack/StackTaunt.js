import { Effect, registerEffect, mapStack } from '../../effectSystem';

// 도발: 적 공격 타겟을 도발 유닛으로 강제 (복수 시 랜덤) + 피격 시 스택 -1
// params: [현재 스택 수] (combatStacks에서 자동 주입)
class StackTaunt extends Effect {
  static ID = 501;
  static PRIORITY = 20;

  modifyEnemyTarget(current, { owner, livingTargets }) {
    if (!owner.alive) return;
    const taunters = (livingTargets || []).filter(u => u.alive && ((u.combatStacks || {})._tauntStacks || 0) > 0);
    if (!taunters.length) return;
    return taunters[Math.floor(Math.random() * taunters.length)];
  }

  onTakeDamage({ owner, unit, damage, attacker }) {
    if (owner.id !== unit.id) return;
    if (!attacker?.isEnemy) return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    const result = { combatStackUpdates: { _tauntStacks: stacks - 1 } };
    if (stacks <= 1) result.log = `  [도발 해제]`;
    return result;
  }
}

registerEffect(StackTaunt);
mapStack('_tauntStacks', 501);
