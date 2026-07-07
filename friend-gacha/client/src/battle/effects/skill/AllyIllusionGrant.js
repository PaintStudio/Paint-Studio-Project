import { Effect, registerEffect } from '../../effectSystem';

class AllyIllusionGrant extends Effect {
  static ID = 339;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const stacks = this.params[0] || 1;
    const updates = [];
    for (const t of targets) {
      const cur = (t.combatStacks || {})._illusionStacks || 0;
      updates.push({ targetId: t.id, stacks: { _illusionStacks: cur + stacks } });
    }

    return {
      partyStackUpdates: updates,
      log: `  ${targets.map(t => t.name).join(', ')}: 환영 ${stacks}스택 부여`,
    };
  }
}

registerEffect(AllyIllusionGrant);
