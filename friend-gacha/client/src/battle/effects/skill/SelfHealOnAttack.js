import { Effect, registerEffect, mapSkillExtra } from '../../effectSystem';

class SelfHealOnAttack extends Effect {
  static ID = 301;
  onPostAttack({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const healAmt = Math.round(unit.maxHp * this.params[0]);
    return {
      selfHeal: healAmt,
      log: `  ${unit.name}: HP ${healAmt} 회복`
    };
  }
}

registerEffect(SelfHealOnAttack);
mapSkillExtra('selfHeal', 301);
