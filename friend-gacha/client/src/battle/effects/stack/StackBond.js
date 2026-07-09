import { Effect, registerEffect, mapStack } from '../../effectSystem';
import gameConfig from '@gameConfig';

const ELEMENT_CHART = {};
for (const [key, val] of Object.entries(gameConfig.elements)) {
  ELEMENT_CHART[key] = { strong: val.strong, weak: val.weak };
}

class StackBond extends Effect {
  static ID = 507;

  modifyElemMult(value, { owner, attacker, skillElem, defender }) {
    if (owner.id !== attacker.id) return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0 || value <= 1.0) return;
    return value + stacks * 0.05;
  }
}

registerEffect(StackBond);
mapStack('_bondStacks', 507);
