import { Effect, registerEffect, mapType } from '../../effectSystem';

class DamageTakenExcBoost extends Effect {
  static ID = 151;
  onTakeDamage({ owner, unit, damage }) {
    if (owner.id !== unit.id) return;
    const cap = unit.maxHp * (this.params[0] || 10);
    const cur = this.getTracker(unit, '_swordUnityDmg');
    return { trackerUpdates: { _swordUnityDmg: Math.min(cur + damage, cap) } };
  }
  modifyDamageDealt(value, { owner, attacker, isUltimate }) {
    if (owner.id !== attacker.id) return;
    if (!isUltimate) return;
    const tracked = this.getTracker(attacker, '_swordUnityDmg');
    if (tracked <= 0) return;
    return Math.round(value + tracked);
  }
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'ultimate') return;
    const tracked = this.getTracker(unit, '_swordUnityDmg');
    if (tracked > 0) {
      return {
        trackerUpdates: { _swordUnityDmg: 0 },
        log: `  [${unit.talent.name}] 기록 ${tracked} 소모 → EXC 데미지 +${tracked}`
      };
    }
  }
}

registerEffect(DamageTakenExcBoost);
mapType('damage_taken_exc_boost', 151);
