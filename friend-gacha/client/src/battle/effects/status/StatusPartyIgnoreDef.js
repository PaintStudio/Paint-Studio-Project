import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusPartyIgnoreDef extends Effect {
  static ID = 206;
  modifyDef(value) {
    return Math.round(value * (1 - (this.params[0] || 0.5)));
  }
}

registerEffect(StatusPartyIgnoreDef);
mapStatus('party_ignore_def', 206);
