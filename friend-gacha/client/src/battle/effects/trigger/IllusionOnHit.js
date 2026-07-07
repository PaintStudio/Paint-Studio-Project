import { Effect, registerEffect, mapType } from '../../effectSystem';

class IllusionOnHit extends Effect {
  static ID = 120;
  onTakeDamage({ owner, unit }) {
    if (owner.id !== unit.id) return;
    if (!unit.alive) return;
    const cur = this.getStack(unit, '_illusionStacks');
    return {
      combatStackUpdates: { _illusionStacks: cur + this.params[0] },
      log: `  [${unit.talent.name}] ${unit.name} 환영 ${cur + this.params[0]}스택`
    };
  }
}

registerEffect(IllusionOnHit);
mapType('illusion_on_hit', 120);
