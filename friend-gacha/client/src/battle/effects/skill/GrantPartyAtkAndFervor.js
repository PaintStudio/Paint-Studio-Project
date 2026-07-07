import { Effect, registerEffect, addBuff } from '../../effectSystem';

// 아군 전체 ATK 버프 + 고조 상태 부여
// args: [atkAmount, atkTurns, fervorPerStack, maxStacks]  예) [0.35, 5, 0.03, 20]
class GrantPartyAtkAndFervor extends Effect {
  static ID = 349;
  onSkillUsed({ owner, unit, skill, targets, modSkill, party }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const alive = (targets?.length ? targets : (party || [])).filter(u => u.alive);
    if (!alive.length) return;
    const atkAmt = this.params[0] || 0.35;
    const atkTurns = this.params[1] || 5;
    const maxStacks = this.params[3] || 20;
    for (const t of alive) {
      addBuff(t.id, 401, ['atk', atkAmt], { turns: atkTurns, skillId: skill.id, skillName: skill.name, casterId: unit.id, label: `+ATK ${Math.round(atkAmt * 100)}%` });
    }
    return {
      applyStatuses: alive.map(t => ({
        targetId: t.id,
        statusKey: 'fervor_grant',
        displayName: '고조',
        turns: atkTurns,
        params: [maxStacks],
      })),
      log: `  [해피 페스티벌] 아군 전체: ATK +${Math.round(atkAmt * 100)}% / 고조 (${atkTurns}사이클)`,
    };
  }
}

registerEffect(GrantPartyAtkAndFervor);
