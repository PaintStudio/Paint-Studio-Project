import { Effect, registerEffect, mapStack } from '../../effectSystem';

// 숙련 스택: 풍 속성 피해 스택당 10% 증가
class StackMastery extends Effect {
  static ID = 505;
  modifyDamageDealt(value, { owner, attacker, skillElem }) {
    if (owner.id !== attacker.id) return;
    if (skillElem !== 'wind') return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return Math.round(value * (1 + stacks * 0.1));
  }
}

registerEffect(StackMastery);
mapStack('_masteryStacks', 505);
