import { Effect, registerEffect, mapType } from '../../effectSystem';

class HpLossTrack extends Effect {
  static ID = 104;
  onTakeDamage({ owner, unit, damage }) {
    if (owner.id !== unit.id) return;
    const cap = unit.maxHp * (this.params[1] || 2);
    const cur = this.getTracker(unit, this.params[0]);
    return { trackerUpdates: { [this.params[0]]: Math.min(cur + damage, cap) } };
  }
  onHealCalc({ owner, caster }) {
    if (owner.id !== caster.id) return;
    if (!this.params[2]) return;
    const tracked = this.getTracker(caster, this.params[0]);
    const consumed = Math.round(tracked * this.params[2]);
    if (consumed > 0) {
      return {
        bonusHeal: consumed,
        trackerUpdates: { [this.params[0]]: tracked - consumed },
        log: `  [${caster.talent.name}] 기록 ${consumed} 소모 → 추가 회복 +${consumed}`
      };
    }
  }
}

registerEffect(HpLossTrack);
mapType('hp_loss_track', 104);
