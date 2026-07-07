import { Effect, registerEffect, mapType } from '../../effectSystem';

class CycleEndShieldConsume extends Effect {
  static ID = 123;
  onCycleEnd({ unit, party, enemies }) {
    if (!unit.alive || !party || !enemies) return;
    const totalShield = party.reduce((sum, u) => sum + (u.shield || 0), 0);
    if (totalShield <= 0) return;
    const aliveEnemies = enemies.filter(e => e.alive);
    if (!aliveEnemies.length) return;
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const damage = Math.round(totalShield * this.params[0]);
    return {
      consumeAllShields: true,
      enemyDamage: { targetId: target.id, targetName: target.name, damage, element: this.params[1] || 'wind' },
      log: `  [${unit.talent.name}] 보호막 ${totalShield} 소모 → ${target.name}: ${damage} ${this.params[1] || 'wind'} 피해`
    };
  }
}

registerEffect(CycleEndShieldConsume);
mapType('cycle_end_shield_consume', 123);
