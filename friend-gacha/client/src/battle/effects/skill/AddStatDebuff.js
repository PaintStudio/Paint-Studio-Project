import { Effect, registerEffect, addDebuff, runCalc } from '../../effectSystem';

// 대상에게 스탯 디버프 부여
// args: [스탯, 비율, 턴수]  예) ['def', 0.3, 3]
class AddStatDebuff extends Effect {
  static ID = 308;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const stat = this.params[0] ?? 'def';
    const amount = this.params[1] ?? skill.power;
    const turns = runCalc('modifyDebuffTurns', [unit], this.params[2] ?? 3, { unit, skill, stat });

    for (const tgt of targets) {
      addDebuff(tgt.id, 402, [stat, amount], { turns, skillId: skill.id, skillName: skill.name, casterId: unit.id, label: `-${stat.toUpperCase()} ${Math.round(amount * 100)}%` });
    }
    return {
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: ${stat.toUpperCase()} ${Math.round(amount * 100)}% 감소 (${turns}턴)`
    };
  }
}

registerEffect(AddStatDebuff);
