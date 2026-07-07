import { Effect, registerEffect, addBuff } from '../../effectSystem';

// 공격 스킬에 추가 버프 부여
// args: [스탯, 비율, 턴수]  예) ['atk', 0.25, 3]
class AddStatBuff extends Effect {
  static ID = 304;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const stat = this.params[0] ?? 'atk';
    const amount = this.params[1] ?? skill.power;
    const turns = this.params[2] ?? 3;

    for (const tgt of targets) {
      addBuff(tgt.id, 401, [stat, amount], { turns, skillId: skill.id, skillName: skill.name, casterId: unit.id, label: `+${stat.toUpperCase()} ${Math.round(amount * 100)}%` });
    }
    return {
      log: `${unit.name} → ${skill.name}: ${stat.toUpperCase()} +${Math.round(amount * 100)}%`
    };
  }
}

registerEffect(AddStatBuff);
