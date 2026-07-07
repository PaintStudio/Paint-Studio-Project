import { Effect, registerEffect } from '../../effectSystem';

// 자신 HP 완전 회복
// args: []
class SelfFullHeal extends Effect {
  static ID = 343;
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const healAmt = unit.maxHp - unit.hp;
    if (healAmt <= 0) return { log: `  ${unit.name}: HP 이미 최대` };
    return { selfHeal: healAmt, log: `  ${unit.name}: HP 완전 회복 (+${healAmt})` };
  }
}

registerEffect(SelfFullHeal);
