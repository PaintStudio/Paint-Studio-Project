import { Effect, registerEffect } from '../../effectSystem';

class AllyTauntGrant extends Effect {
  static ID = 330;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill?.id !== skill?.id) return;
    if (!targets?.length) return;
    const allyStacks = this.params[0] || 1;
    const selfStacks = this.params[1] || 3;
    const updates = [];
    for (const t of targets) {
      const stacks = t.id === unit.id ? selfStacks : allyStacks;
      const cur = (t.combatStacks || {})._tauntStacks || 0;
      updates.push({ targetId: t.id, stacks: { _tauntStacks: cur + stacks } });
    }
    return {
      partyStackUpdates: updates,
      log: `  ${targets.map(t => `${t.name}: 도발 ${t.id === unit.id ? selfStacks : allyStacks}스택`).join(', ')}`
    };
  }
}

registerEffect(AllyTauntGrant);
