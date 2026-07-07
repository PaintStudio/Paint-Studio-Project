import { Effect, registerEffect } from '../../effectSystem';

// 스킬 사용 시 도발 스택 획득
// args: [스택수]  예) [5]
class TauntGainOnUse extends Effect {
  static ID = 306;

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const stacks = this.params[0] ?? 1;
    const current = (unit.combatStacks || {})._tauntStacks || 0;
    return {
      combatStackUpdates: { _tauntStacks: current + stacks },
      log: `  ${unit.name}: 도발 ${stacks}스택 획득`
    };
  }
}

registerEffect(TauntGainOnUse);
