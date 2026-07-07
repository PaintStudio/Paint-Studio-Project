import { Effect, registerEffect } from '../../effectSystem';

class SelfDebuffCleanse extends Effect {
  static ID = 332;

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill?.id !== skill?.id) return;
    const count = this.params[0] || 1;
    return {
      selfCleanse: count,
      log: `  ${unit.name}: 디버프 ${count}종 제거`
    };
  }
}

registerEffect(SelfDebuffCleanse);
