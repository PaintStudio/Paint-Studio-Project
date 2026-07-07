import { Effect, registerEffect, getEffStat, addBuff } from '../../effectSystem';

// 대상에게 ATK 버프 + 스킬 사용 시 회복 버프 부여
// args: [atkAmount, healRatio, turns]  예) [0.25, 0.33, 5]
class VitalityInfusion extends Effect {
  static ID = 318;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const atkAmount = this.params[0] ?? 0.25;
    const healRatio = this.params[1] ?? 0.33;
    const turns = this.params[2] ?? 5;
    const healPerUse = Math.round(getEffStat(unit, 'atk') * healRatio);

    for (const tgt of targets) {
      addBuff(tgt.id, 401, ['atk', atkAmount], { turns, skillId: skill.id, skillName: skill.name, casterId: unit.id, label: `+ATK ${Math.round(atkAmount * 100)}%` });
      addBuff(tgt.id, 404, [healPerUse], { turns, skillId: skill.id, skillName: skill.name, casterId: unit.id, label: `활력 주입` });
    }
    return {
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: ATK +${Math.round(atkAmount * 100)}%, 스킬 사용 시 HP ${healPerUse} 회복 (${turns}사이클)`,
    };
  }
}

registerEffect(VitalityInfusion);
