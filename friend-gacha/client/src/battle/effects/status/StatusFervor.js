import { Effect, registerEffect, mapStatus } from '../../effectSystem';

// 고조 상태: 공격 스킬 사용 시 고조 스택 1 획득
// params: [maxStacks]  예) [20]
class StatusFervor extends Effect {
  static ID = 215;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'attack') return;
    const max = this.params[0] || 20;
    const cur = (unit.combatStacks || {})._fervorStacks || 0;
    if (cur >= max) return;
    return {
      combatStackUpdates: { _fervorStacks: cur + 1 },
      log: `  [고조] ${unit.name}: 고조 ${cur + 1}스택`,
    };
  }
}

registerEffect(StatusFervor);
mapStatus('fervor_grant', 215);
