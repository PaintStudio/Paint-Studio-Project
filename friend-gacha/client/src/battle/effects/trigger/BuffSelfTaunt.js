import { Effect, registerEffect, mapType } from '../../effectSystem';

class BuffSelfTaunt extends Effect {
  static ID = 116;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'buff') return;
    if (!targets?.some(t => t.id === unit.id)) return;
    const cur = this.getStack(unit, '_tauntStacks');
    const newStacks = cur + this.params[0];
    return {
      combatStackUpdates: { _tauntStacks: newStacks },
      log: `  [${unit.talent.name}] 도발 ${newStacks}스택`
    };
  }
}

registerEffect(BuffSelfTaunt);
mapType('buff_self_taunt', 116);
