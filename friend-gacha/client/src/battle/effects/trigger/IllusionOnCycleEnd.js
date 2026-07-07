import { Effect, registerEffect, mapType } from '../../effectSystem';

class IllusionOnCycleEnd extends Effect {
  static ID = 131;
  onCycleEnd({ unit, party }) {
    if (!unit.alive || !party) return;
    const intellectCount = party.filter(u => u.alive && u.origin === 'intellect').length;
    if (intellectCount <= 0) return;
    const gain = intellectCount * this.params[0];
    const cur = this.getStack(unit, '_illusionStacks');
    return {
      combatStackUpdates: { _illusionStacks: cur + gain },
      log: `  [${unit.talent.name}] 지성 ${intellectCount}명 → 환영 +${gain} (${cur + gain}스택)`
    };
  }
}

registerEffect(IllusionOnCycleEnd);
mapType('illusion_on_cycle_end', 131);
