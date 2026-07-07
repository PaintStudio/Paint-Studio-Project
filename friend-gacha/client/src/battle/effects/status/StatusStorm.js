import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusStorm extends Effect {
  static ID = 204;
  calcDamageReduction(value, { skillElem, owner }) {
    if (skillElem !== 'wind') return;
    const stacks = this.getStack(owner, '_stormStacks');
    if (stacks > 0) return value - (stacks * 0.25);
  }
}

registerEffect(StatusStorm);
mapStatus('storm', 204);
