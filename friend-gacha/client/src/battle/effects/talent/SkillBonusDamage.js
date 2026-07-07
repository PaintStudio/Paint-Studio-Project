import { Effect, registerEffect, mapType, getEffStat } from '../../effectSystem';

class SkillBonusDamage extends Effect {
  static ID = 150;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'attack' && skill.type !== 'defense') return;
    const atk = getEffStat(unit, 'atk');
    const damage = Math.round(atk * (this.params[0] || 0.8));
    const elem = this.params[1] || unit.element;
    const enemyTargets = (targets || []).filter(t => t.isEnemy);
    if (!enemyTargets.length) return;
    return {
      bonusDamage: enemyTargets.map(t => ({ targetId: t.id, damage, element: elem })),
      logs: enemyTargets.map(t => `  [${unit.talent.name}] ${t.name}: ${damage} ${elem} 추가 피해`)
    };
  }
}

registerEffect(SkillBonusDamage);
mapType('skill_bonus_damage', 150);
