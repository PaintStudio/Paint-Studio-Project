import { Effect, registerEffect, mapType } from '../../effectSystem';

class WindPartyScaling extends Effect {
  static ID = 129;
  modifyStat(value, { stat, owner, unit }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'atk') return;
    const windCount = this.getStack(owner, '_windPartyCount');
    if (windCount > 0) return Math.round(value * (1 + windCount * this.params[0]));
  }
}

registerEffect(WindPartyScaling);
mapType('wind_party_scaling', 129);
