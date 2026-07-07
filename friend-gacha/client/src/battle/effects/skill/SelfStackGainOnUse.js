import { Effect, registerEffect } from '../../effectSystem';

// 스킬 사용 시 지정 스택 획득
// args: [stackKey, amount]  예) ["_hornStacks", 3]
class SelfStackGainOnUse extends Effect {
  static ID = 347;
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const key = this.params[0];
    const amount = this.params[1] || 1;
    if (!key) return;
    const cur = (unit.combatStacks || {})[key] || 0;
    return {
      combatStackUpdates: { [key]: cur + amount },
      log: `  ${unit.name}: ${key.replace(/^_|Stacks$/g, '')} ${amount}스택 획득`,
    };
  }
}

registerEffect(SelfStackGainOnUse);
