import { Effect, registerEffect, mapType } from '../../effectSystem';

class Lifesteal extends Effect {
  static ID = 15;
  lifestealRate(value) {
    return value + this.params[0];
  }
}

registerEffect(Lifesteal);
mapType('lifesteal', 15);
