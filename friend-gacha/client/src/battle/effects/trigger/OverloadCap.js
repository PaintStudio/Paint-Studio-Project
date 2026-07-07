import { Effect, registerEffect, mapType } from '../../effectSystem';

class OverloadCap extends Effect {
  static ID = 121;
  modifyOverloadInc(value, { currentOverload }) {
    if (currentOverload === undefined) return;
    if (currentOverload >= this.params[0]) return 0;
    return Math.min(value, this.params[0] - currentOverload);
  }
}

registerEffect(OverloadCap);
mapType('overload_cap', 121);
