import { Effect, registerEffect, addBuff, getEffStat } from '../../effectSystem';

// 대상에게 DEF 버프 + 사이클 개시 회복 상태 부여
// args: [defAmount, turns, atkRatio]  예) [0.75, 3, 2.0]
class GrantDefBuffAndCycleHeal extends Effect {
  static ID = 340;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const defAmount = this.params[0] || 0.75;
    const turns = this.params[1] || 3;
    const atkRatio = this.params[2] || 2.0;
    const healAmt = Math.round(getEffStat(unit, 'atk') * atkRatio);

    const statuses = [];
    const logs = [];
    for (const t of targets) {
      addBuff(t.id, 401, ['def', defAmount], { turns, skillId: skill.id, skillName: skill.name, casterId: unit.id, label: `+DEF ${Math.round(defAmount * 100)}%` });
      statuses.push({ targetId: t.id, statusKey: 'cycle_heal', displayName: '사이클 회복', turns, params: [healAmt] });
      logs.push(`  ${t.name}: DEF +${Math.round(defAmount * 100)}% / 사이클 HP ${healAmt} 회복 (${turns}사이클)`);
    }
    return { applyStatuses: statuses, logs };
  }
}

registerEffect(GrantDefBuffAndCycleHeal);
