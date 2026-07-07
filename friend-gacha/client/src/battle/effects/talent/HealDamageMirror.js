import { Effect, registerEffect, mapType } from '../../effectSystem';

class HealDamageMirror extends Effect {
  static ID = 140;
  onSkillUsed({ owner, unit, skill, targets, party, enemies }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'heal' || !enemies) return;
    const aliveEnemies = enemies.filter(e => e.alive);
    if (!aliveEnemies.length) return;
    const weakest = aliveEnemies.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
    let totalHeal = 0;
    for (const t of targets) {
      totalHeal += Math.round(t.maxHp * skill.power);
    }
    const damage = Math.round(totalHeal * (this.params[0] || 1));
    return {
      enemyDamage: { targetId: weakest.id, targetName: weakest.name, damage, element: this.params[1] || unit.element },
      log: `  [${unit.talent.name}] 치유 ${totalHeal} → ${weakest.name}: ${damage} ${this.params[1] || unit.element} 피해`
    };
  }
}

registerEffect(HealDamageMirror);
mapType('heal_damage_mirror', 140);
