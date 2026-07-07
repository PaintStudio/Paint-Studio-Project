import { Effect, registerEffect, mapType } from '../../effectSystem';

class PartyBuff extends Effect {
  static ID = 160;
  modifyStat(value, { owner, unit, stat }) {
    if (!owner.alive || owner.id === unit.id) return;
    if (this.params[0] === stat) return Math.round(value * (1 + this.params[1]));
  }
}

registerEffect(PartyBuff);
mapType('party_buff', 160);
