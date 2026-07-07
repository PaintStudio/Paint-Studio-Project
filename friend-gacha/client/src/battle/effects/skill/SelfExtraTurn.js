import { Effect, registerEffect } from '../../effectSystem';

// 시전자에게 추가 턴 부여
// args: []
class SelfExtraTurn extends Effect {
  static ID = 342;
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    return { grantExtraTurn: unit.id, log: `  ${unit.name}: 추가 턴 획득` };
  }
}

registerEffect(SelfExtraTurn);
