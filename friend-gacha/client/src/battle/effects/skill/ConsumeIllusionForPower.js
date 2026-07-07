import { Effect, registerEffect } from '../../effectSystem';

// 환영 스택을 전소모하여 위력 증가
// args: [스택당 위력 증가]  예) [0.25]
class ConsumeIllusionForPower extends Effect {
  static ID = 324;

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const stacks = (unit.combatStacks || {})._illusionStacks || 0;
    if (stacks <= 0) return { combatStackUpdates: { _illusionStacks: 0 } };
    const powerPerStack = this.params[0] || 0.25;
    return {
      combatStackUpdates: { _illusionStacks: 0 },
      illusionPowerBonus: stacks * powerPerStack,
      log: `  [메타포모시스] 환영 ${stacks}스택 소모 → 위력 +${Math.round(stacks * powerPerStack * 100)}%`,
    };
  }
}

registerEffect(ConsumeIllusionForPower);
