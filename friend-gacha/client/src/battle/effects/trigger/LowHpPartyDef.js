import { Effect, registerEffect, mapType } from '../../effectSystem';

class LowHpPartyDef extends Effect {
  static ID = 115;
  partyDefenseAura(value, { owner }) {
    if (!owner.alive || owner.hp / owner.maxHp > this.params[0]) return;
    return value + this.params[1];
  }
}

registerEffect(LowHpPartyDef);
mapType('low_hp_party_def', 115);
