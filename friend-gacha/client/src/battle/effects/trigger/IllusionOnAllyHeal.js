import { Effect, registerEffect, mapType } from '../../effectSystem';

class IllusionOnAllyHeal extends Effect {
  static ID = 119;
  onAllyHealed({ owner }) {
    if (!owner.alive) return;
    const cur = this.getStack(owner, '_illusionStacks');
    return {
      combatStackUpdates: { _illusionStacks: cur + this.params[0] },
      log: `  [${owner.talent.name}] ${owner.name} 환영 ${cur + this.params[0]}스택`
    };
  }
}

registerEffect(IllusionOnAllyHeal);
mapType('illusion_on_ally_heal', 119);
