import { Effect, registerEffect, mapType } from '../../effectSystem';

class HealStarStack extends Effect {
  static ID = 157;
  onSkillUsed({ owner, unit, skill, targets, actualCost }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'heal' || !targets?.length) return;
    const stacks = actualCost || skill.cost || 1;
    const updates = [];
    for (const t of targets) {
      const cur = this.getStack(t, '_starflowerStacks');
      updates.push({ targetId: t.id, stacks: { _starflowerStacks: cur + stacks } });
    }
    return {
      partyStackUpdates: updates,
      log: `  [${unit.talent.name}] 별꽃 ${stacks}스택 부여 (노트 ${stacks}개 소모)`
    };
  }
  modifyStat(value, { stat, unit }) {
    if (stat !== 'hp') return;
    const stacks = this.getStack(unit, '_starflowerStacks');
    if (stacks > 0) return Math.round(value * (1 + stacks * (this.params[0] || 0.02)));
  }
}

registerEffect(HealStarStack);
mapType('heal_star_stack', 157);
