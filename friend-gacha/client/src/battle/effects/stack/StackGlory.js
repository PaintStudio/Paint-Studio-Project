import { Effect, registerEffect, mapStack } from '../../effectSystem';

// 영광 스택: 염 속성 피해 스택당 25% 증가
class StackGlory extends Effect {
  static ID = 506;
  modifyDamageDealt(value, { owner, attacker, skillElem }) {
    if (owner.id !== attacker.id) return;
    if (skillElem !== 'fire') return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return Math.round(value * (1 + stacks * 0.25));
  }
}

registerEffect(StackGlory);
mapStack('_gloryStacks', 506);
