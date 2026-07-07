import { Effect, registerEffect } from '../../effectSystem';

class EchoStackGrant extends Effect {
  static ID = 328;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill?.id !== skill?.id) return;
    if (!targets?.length) return;
    const count = this.params[0] || 4;
    const updates = [];
    for (const t of targets) {
      updates.push({ targetId: t.id, stacks: { _echoStacks: count } });
    }
    return {
      partyStackUpdates: updates,
      log: `  [${skill.name}] 울림 ${count}스택 부여`
    };
  }
}

registerEffect(EchoStackGrant);
