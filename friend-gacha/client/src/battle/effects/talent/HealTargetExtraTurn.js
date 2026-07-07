import { Effect, registerEffect, mapType } from '../../effectSystem';

class HealTargetExtraTurn extends Effect {
  static ID = 158;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'heal' || !targets?.length) return;
    const used = this.getStack(unit, '_stellarUsed');
    if (used) return;
    const target = targets[0];
    if (target.id === unit.id) return;
    return {
      combatStackUpdates: { _stellarUsed: 1 },
      grantExtraTurn: target.id,
      log: `  [${unit.talent.name}] ${target.name}에게 추가 턴 부여!`
    };
  }
  onCycleEnd() {
    return { combatStackUpdates: { _stellarUsed: 0 } };
  }
}

registerEffect(HealTargetExtraTurn);
mapType('heal_target_extra_turn', 158);
