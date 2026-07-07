import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusCycleTauntGrant extends Effect {
  static ID = 207;
  onCycleStart({ unit }) {
    if (!unit.alive) return;
    const cur = this.getStack(unit, '_tauntStacks');
    return {
      combatStackUpdates: { _tauntStacks: cur + this.params[0] },
      log: `  [트윙클 피스] ${unit.name} 도발 ${this.params[0]}스택 획득`
    };
  }
}

registerEffect(StatusCycleTauntGrant);
mapStatus('cycle_taunt_grant', 207);
