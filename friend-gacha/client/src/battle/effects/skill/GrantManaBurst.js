import { Effect, registerEffect } from '../../effectSystem';

// 마나 크리에이션: 자신에게 마나 폭주 상태 부여 + 솔로 시 쿨다운 감소
// args: [healRatio, olReduce, dmgReduce, soloCdReduce]  예) [0.15, 1, 0.5, 6]
class GrantManaBurst extends Effect {
  static ID = 350;
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    return {
      applyStatuses: [{
        targetId: unit.id,
        statusKey: 'mana_burst',
        displayName: '마나 폭주',
        turns: 1,
        params: [this.params[0] || 0.15, this.params[1] || 1, this.params[2] || 0.5],
      }],
      log: `  [마나 크리에이션] ${unit.name}: 마나 폭주 발동`,
    };
  }

  modifyBaseCooldown(value, { owner, unit, skill, modSkill, party }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill?.id !== modSkill.id) return;
    const aliveCount = (party || []).filter(u => u.alive).length;
    if (aliveCount > 1) return;
    const cdReduce = this.params[3] || 6;
    return Math.max(0, value - cdReduce);
  }
}

registerEffect(GrantManaBurst);
