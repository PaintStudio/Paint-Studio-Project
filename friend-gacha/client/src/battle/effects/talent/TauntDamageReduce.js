import { Effect, registerEffect, mapType } from '../../effectSystem';

class TauntDamageReduce extends Effect {
  static ID = 148;
  calcDamageReduction(value, { owner }) {
    const taunt = this.getStack(owner, '_tauntStacks');
    if (taunt > 0) return value + (this.params[0] || 0.1);
  }
}

registerEffect(TauntDamageReduce);
mapType('taunt_damage_reduce', 148);
