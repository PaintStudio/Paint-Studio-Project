import { Effect, registerEffect } from '../../effectSystem';

class DefenseTauntWithBonus extends Effect {
  static ID = 335;

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (skill.type !== 'defense') return;

    const baseTaunt = this.params[0] || 1;
    const bonusTaunt = this.params[1] || 2;
    const priorDef = (unit.combatStacks || {})._defenseUsedThisCycle || 0;
    let total = baseTaunt;
    const logs = [];
    if (priorDef > 0) {
      total += bonusTaunt;
      logs.push(`  [수호하기] 이전 방어 감지 → 추가 도발 +${bonusTaunt}`);
    }
    logs.push(`  ${unit.name}: 도발 ${total}스택 획득`);
    const cur = (unit.combatStacks || {})._tauntStacks || 0;
    return {
      partyStackUpdates: [{ targetId: unit.id, stacks: { _tauntStacks: cur + total } }],
      logs,
    };
  }
}

registerEffect(DefenseTauntWithBonus);
