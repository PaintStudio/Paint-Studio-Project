import { Effect, registerEffect, mapStack } from '../../effectSystem';

class StackOriginConsume extends Effect {
  static ID = 510;

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'attack' && skill.type !== 'ultimate') return;
    const cur = this.getStack(unit, '_originStacks');
    if (cur <= 0) return;
    return {
      combatStackUpdates: { _originStacks: cur - 1 },
      log: `  [천의] 근원 1스택 소모 (잔여 ${cur - 1})`,
    };
  }
}

registerEffect(StackOriginConsume);
mapStack('_originStacks', 510);
