import { Effect, registerEffect } from '../../effectSystem';

// 스킬 사용 시 환영 스택 획득
// args: [스택수]  예) [1]
class IllusionGain extends Effect {
  static ID = 322;

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const stacks = this.params[0] ?? 1;
    const current = (unit.combatStacks || {})._illusionStacks || 0;
    return {
      combatStackUpdates: { _illusionStacks: current + stacks },
      log: `  [환영] ${unit.name} 환영 ${current + stacks}스택`,
    };
  }
}

registerEffect(IllusionGain);
