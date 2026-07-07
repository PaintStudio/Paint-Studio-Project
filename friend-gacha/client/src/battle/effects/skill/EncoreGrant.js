import { Effect, registerEffect, mapSkillExtra } from '../../effectSystem';

class EncoreGrant extends Effect {
  static ID = 302;
  onPostSkill({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (targets.length !== 1) return;
    const tgt = targets[0];
    const cur = this.getStack(tgt, '_encoreStacks');
    const key = tgt.isEnemy ? 'targetStackUpdates' : 'partyStackUpdates';
    return {
      [key]: [{ targetId: tgt.id, stacks: { _encoreStacks: cur + this.params[0] } }],
      log: `  ${tgt.name}: 앵콜 ${this.params[0]}스택 부여`
    };
  }
}

registerEffect(EncoreGrant);
mapSkillExtra('encore_grant', 302);
