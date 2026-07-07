import { Effect, registerEffect, getEffStat } from '../../effectSystem';

class AllyLowHpShield extends Effect {
  static ID = 217;
  onPartyTakeDamage({ owner, damagedUnit }) {
    if (!owner.alive) return;
    if (damagedUnit.id === owner.id) return;
    if (this.state._usedThisCycle) return;
    const threshold = this.params[0] || 0.25;
    if (damagedUnit.hp > damagedUnit.maxHp * threshold) return;
    this.state._usedThisCycle = true;
    const ratio = this.params[1] || 3;
    const amount = Math.round(getEffStat(owner, 'atk') * ratio);
    return {
      partyShieldGrant: [{ unitId: damagedUnit.id, amount }],
      log: `  [물러서지 않는 수호자] ${damagedUnit.name}에게 보호막 ${amount} 부여`,
    };
  }
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    this.state._usedThisCycle = false;
  }
}

registerEffect(AllyLowHpShield);
