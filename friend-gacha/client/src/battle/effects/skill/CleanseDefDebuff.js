import { Effect, registerEffect, cleanseByStat } from '../../effectSystem';

class CleanseDefDebuff extends Effect {
  static ID = 336;

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const stat = this.params[0] || 'def';
    const removed = cleanseByStat(unit.id, stat);
    if (!removed) return;
    return { log: `  ${unit.name}: ${stat.toUpperCase()} 감소 디버프 해제` };
  }
}

registerEffect(CleanseDefDebuff);
