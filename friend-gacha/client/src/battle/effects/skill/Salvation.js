import { Effect, registerEffect, getEffStat, addBuff } from '../../effectSystem';

// 대상에게 '구원' 버프 부여 — 피격 시 시전자 ATK 기반 HP 회복
// args: [회복비율, 턴수]  예) [0.75, 2]
class Salvation extends Effect {
  static ID = 307;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const ratio = this.params[0] ?? 0.75;
    const turns = this.params[1] ?? 2;
    const healPerHit = Math.round(getEffStat(unit, 'atk') * ratio);

    for (const tgt of targets) {
      addBuff(tgt.id, 403, [healPerHit], { turns, skillId: skill.id, skillName: skill.name, casterId: unit.id, label: '구원' });
    }
    return {
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: 구원 부여 (${turns}사이클, 피격 시 ${healPerHit} 회복)`
    };
  }
}

registerEffect(Salvation);
