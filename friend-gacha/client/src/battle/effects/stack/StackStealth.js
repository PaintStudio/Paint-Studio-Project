import { Effect, registerEffect, mapStack } from '../../effectSystem';

// 은신: 적 공격 타겟에서 이 유닛 제외 (도발보다 낮은 우선도)
// params: [현재 스택 수]
class StackStealth extends Effect {
  static ID = 503;
  static PRIORITY = 10;

  modifyEnemyTarget(current, { owner, livingTargets }) {
    if (!owner.alive) return;
    if (current?.id === owner.id) {
      const others = livingTargets?.filter(u => u.id !== owner.id && u.alive);
      if (others?.length) return others[Math.floor(Math.random() * others.length)];
    }
  }
}

registerEffect(StackStealth);
mapStack('_stealthStacks', 503);
