import { Effect, registerEffect } from '../../effectSystem';

// 대상에게 추가 턴 부여
// args 없음
class GrantExtraTurn extends Effect {
  static ID = 315;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length || targets.length !== 1) return;

    const tgt = targets[0];
    return {
      grantExtraTurn: tgt.id,
      log: `  ${tgt.name}에게 추가 턴 부여!`,
    };
  }
}

registerEffect(GrantExtraTurn);
