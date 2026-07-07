import { Effect, registerEffect } from '../../effectSystem';

class PartyExtraTurn extends Effect {
  static ID = 353;
  onSkillUsed({ owner, unit, skill, modSkill, party }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const others = (party || []).filter(u => u.alive && u.id !== unit.id);
    if (!others.length) return;
    return {
      grantExtraTurns: others.map(u => u.id),
      log: `  다른 아군 전체 추가 턴 획득!`,
    };
  }
}

registerEffect(PartyExtraTurn);
