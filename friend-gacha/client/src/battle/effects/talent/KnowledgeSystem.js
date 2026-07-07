import { Effect, registerEffect } from '../../effectSystem';

// 암 속성 스킬 → 지식 획득, 광 속성 스킬 → 코스트 -1 + 지식 소모
// args: []
class KnowledgeSystem extends Effect {
  static ID = 171;

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    const cur = (unit.combatStacks || {})._knowledgeStacks || 0;

    if (skill?.element === 'dark') {
      return {
        combatStackUpdates: { _knowledgeStacks: cur + 1 },
        log: `  [탐험하는 천사] ${unit.name}: 지식 ${cur + 1}스택`,
      };
    }

    if (skill?.element === 'light' && cur > 0) {
      return {
        combatStackUpdates: { _knowledgeStacks: cur - 1 },
        log: `  [탐험하는 천사] 지식 1스택 소모 (잔여 ${cur - 1})`,
      };
    }
  }

  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.element !== 'light') return;
    if (((unit.combatStacks || {})._knowledgeStacks || 0) <= 0) return;
    return Math.max(1, value - 1);
  }
}

registerEffect(KnowledgeSystem);
