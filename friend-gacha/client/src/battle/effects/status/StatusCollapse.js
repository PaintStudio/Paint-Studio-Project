import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusCollapse extends Effect {
  static ID = 205;
  modifyDefAsDefender(value, { owner }) {
    const stacks = this.getStack(owner, '_collapseStacks');
    if (stacks > 0) return Math.round(value * Math.max(0, 1 - stacks * 0.01));
  }
}

registerEffect(StatusCollapse);
mapStatus('collapse', 205);
