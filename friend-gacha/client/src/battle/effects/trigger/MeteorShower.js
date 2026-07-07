import { Effect, registerEffect, mapType } from '../../effectSystem';

class MeteorShower extends Effect {
  static ID = 133;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    return {
      combatStackUpdates: { _lastSkill: JSON.stringify({ id: skill.id, name: skill.name, element: skill.element, power: skill.power, type: skill.type, target: skill.target, extra: skill.extra }) }
    };
  }
  onCycleEnd({ unit, enemies }) {
    if (!unit.alive) return;
    const raw = (unit.combatStacks || {})._lastSkill;
    if (!raw) return;
    const skill = JSON.parse(raw);
    if (!skill.power || skill.power <= 0) return;
    if (skill.type !== 'attack' && skill.type !== 'ultimate') return;
    const isLight = skill.element === 'light';
    const aliveEnemies = (enemies || []).filter(e => e.alive);
    if (!aliveEnemies.length) return;
    const targets = isLight ? aliveEnemies : [aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]];
    return {
      meteorAttack: { skill, targets: targets.map(t => t.id), isAoe: isLight },
      log: `  [${unit.talent.name}] ${skill.name} 재사용!${isLight ? ' (광 속성 → 전체)' : ''}`
    };
  }
}

registerEffect(MeteorShower);
mapType('meteor_shower', 133);
