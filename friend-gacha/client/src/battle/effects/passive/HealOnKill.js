import { Effect, registerEffect, mapType } from '../../effectSystem';

class HealOnKill extends Effect {
  static ID = 14;
  healOnKill(value) {
    return value + this.params[0];
  }
}

registerEffect(HealOnKill);
mapType('heal_on_kill', 14);
