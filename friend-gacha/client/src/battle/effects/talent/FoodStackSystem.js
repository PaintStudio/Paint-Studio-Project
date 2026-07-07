import { Effect, registerEffect } from '../../effectSystem';

class FoodStackSystem extends Effect {
  static ID = 189;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'buff') return;
    const cur = (unit.combatStacks || {})._foodStacks || 0;
    return {
      combatStackUpdates: { _foodStacks: cur + 1 },
      log: `  [요리의 대가] ${unit.name}: 음식 ${cur + 1}스택`,
    };
  }
  modifyHealAmount(value, { owner, caster, skill }) {
    if (owner.id !== caster?.id) return;
    if (skill?.type !== 'heal') return;
    const stacks = (caster.combatStacks || {})._foodStacks || 0;
    if (stacks <= 0) return;
    this.state._consumeFood = true;
    const boost = this.params[0] || 1;
    return Math.round(value * (1 + boost));
  }
  onPostSkill({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'heal') return;
    if (!this.state._consumeFood) return;
    this.state._consumeFood = false;
    const cur = (unit.combatStacks || {})._foodStacks || 0;
    if (cur <= 0) return;
    return {
      combatStackUpdates: { _foodStacks: cur - 1 },
      log: `  [요리의 대가] ${unit.name}: 음식 1스택 소모 (잔여 ${cur - 1})`,
    };
  }
}

registerEffect(FoodStackSystem);
