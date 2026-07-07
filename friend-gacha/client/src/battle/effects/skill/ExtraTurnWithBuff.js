import { Effect, registerEffect, addBuff } from '../../effectSystem';

class ExtraTurnWithBuff extends Effect {
  static ID = 354;
  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length || targets.length !== 1) return;
    const tgt = targets[0];
    const stat = this.params[0] || 'atk';
    const amount = this.params[1] || 0.3;
    const turns = this.params[2] || 1;
    addBuff(tgt.id, 401, [stat, amount], {
      turns, skillId: skill.id, skillName: skill.name, casterId: unit.id,
      label: `+${stat.toUpperCase()} ${Math.round(amount * 100)}%`,
    });
    return {
      grantExtraTurn: tgt.id,
      log: `  ${tgt.name}: 추가 턴 + ${stat.toUpperCase()} +${Math.round(amount * 100)}%`,
    };
  }
}

registerEffect(ExtraTurnWithBuff);
