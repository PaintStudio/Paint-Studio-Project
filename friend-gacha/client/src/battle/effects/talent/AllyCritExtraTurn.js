import { Effect, registerEffect } from '../../effectSystem';

class AllyCritExtraTurn extends Effect {
  static ID = 197;
  onCrit({ owner, attacker }) {
    if (attacker.isEnemy) return;
    if (!owner.alive) return;
    if (this.state._usedThisCycle) return;
    this.state._usedThisCycle = true;
    return {
      grantExtraTurn: owner.id,
      log: `  [먼 미래의 용술사] 아군 치명타 감지 → ${owner.name} 추가 턴 획득`,
    };
  }
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    this.state._usedThisCycle = false;
  }
}

registerEffect(AllyCritExtraTurn);
