import { Effect, registerEffect, mapStack } from '../../effectSystem';

class StackPrepare extends Effect {
  static ID = 509;

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'attack' && skill.type !== 'ultimate') return;
    return {
      combatStackUpdates: { _prepared: false },
      log: `  [프리페어] 소모됨`,
    };
  }
}

registerEffect(StackPrepare);
mapStack('_prepared', 509);
