import { Effect, registerEffect } from '../../effectSystem';

// 염 속성 대상에게 버프 사용 시 숙련 스택 획득
// args: [targetElement, stacksPerUse]  예) ['fire', 1]
class MasteryOnBuffFire extends Effect {
  static ID = 162;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'buff') return;
    const elem = this.params[0] || 'fire';
    if (!targets?.some(t => t.element === elem)) return;
    const gain = this.params[1] || 1;
    const cur = (unit.combatStacks || {})._masteryStacks || 0;
    return {
      combatStackUpdates: { _masteryStacks: cur + gain },
      log: `  [숙련] ${unit.name}: 숙련 ${cur + gain}스택`,
    };
  }
}

registerEffect(MasteryOnBuffFire);
