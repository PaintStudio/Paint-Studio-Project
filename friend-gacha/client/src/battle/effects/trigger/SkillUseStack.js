import { Effect, registerEffect, mapType } from '../../effectSystem';

class SkillUseStack extends Effect {
  static ID = 101;
  modifyStat(value, { stat, owner, unit }) {
    if (owner.id !== unit.id) return;
    const stacks = this.getStack(owner, this.params[0]);
    if (stat === 'atk' && this.params[1]) return Math.round(value * (1 + stacks * this.params[1]));
    if (stat === 'def' && this.params[2]) return Math.round(value * (1 + stacks * this.params[2]));
  }
  onSkillUsed({ owner, unit, targetId, targets }) {
    if (owner.id !== unit.id) return;
    const primaryTargetId = targetId || targets?.[0]?.id;
    const cs = unit.combatStacks || {};
    const cur = cs[this.params[0]] || 0;
    const lastTarget = cs[`_${this.params[0]}_target`];
    const newCount = (this.params[4] && lastTarget != null && lastTarget !== primaryTargetId)
      ? 1 : Math.min(cur + 1, this.params[3]);
    return {
      combatStackUpdates: { [this.params[0]]: newCount, [`_${this.params[0]}_target`]: primaryTargetId },
      log: `  [${unit.talent.name}] ${this.params[0]} ${newCount}스택 (ATK/DEF +${newCount * Math.round((this.params[1] || 0) * 100)}%)`
    };
  }
}

registerEffect(SkillUseStack);
mapType('skill_use_stack', 101);
