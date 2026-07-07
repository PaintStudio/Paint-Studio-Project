import { Effect, registerEffect } from '../../effectSystem';

class GrantFarewell extends Effect {
  static ID = 351;
  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;
    const stacks = this.params[0] || 3;
    return {
      targetStackUpdates: targets.map(t => ({
        targetId: t.id,
        stacks: { _farewellStacks: ((t.combatStacks || {})._farewellStacks || 0) + stacks },
      })),
      log: `  ${targets.map(t => t.name).join(', ')}: 작별 ${stacks}스택 부여`,
    };
  }
}

registerEffect(GrantFarewell);
