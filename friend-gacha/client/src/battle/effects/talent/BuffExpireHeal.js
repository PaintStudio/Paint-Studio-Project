import { Effect, registerEffect, mapType } from '../../effectSystem';

class BuffExpireHeal extends Effect {
  static ID = 138;
  onCycleEnd({ unit, party }) {
    if (!unit.alive || !party) return;
    const heals = [];
    for (const ally of party) {
      if (!ally.alive) continue;
      const expired = ally._expiredBuffs || [];
      if (expired.some(b => b.casterId === unit.id)) {
        const amt = Math.round(ally.maxHp * this.params[0]);
        heals.push({ unitId: ally.id, amount: amt });
      }
    }
    if (!heals.length) return;
    return {
      partyHeal: heals,
      log: `  [${unit.talent.name}] 버프 만료 → ${heals.length}명 HP 회복`
    };
  }
}

registerEffect(BuffExpireHeal);
mapType('buff_expire_heal', 138);
