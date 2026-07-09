import { Effect, registerEffect, mapStack, attachBuff } from '../../effectSystem';

class StackPendingSpd extends Effect {
  static ID = 508;

  onCycleEnd({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const pending = (unit.combatStacks || {})._pendingSpeedBuff;
    if (!pending) return;
    attachBuff(unit.id, { stat: 'spd', amount: pending.amount, turns: pending.turns, skillId: pending.skillId, skillName: pending.skillName, casterId: unit.id });
    return {
      combatStackUpdates: { _pendingSpeedBuff: null },
      log: `  [파고들기] ${unit.name} SPD ${Math.round(pending.amount * 100)}% 증가`,
    };
  }
}

registerEffect(StackPendingSpd);
mapStack('_pendingSpeedBuff', 508);
