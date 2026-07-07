import { Effect, registerEffect } from '../../effectSystem';

class NextSkillFreeCost extends Effect {
  static ID = 352;
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    this.state._nextFree = true;
    return { log: `  [린드브룸 왈츠] ${unit.name}: 다음 스킬 코스트 0` };
  }
  modifyCost(value, { owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill && skill?.id === modSkill.id) return;
    if (!this.state._nextFree) return;
    return 0;
  }
  onPostSkill({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill && skill?.id === modSkill.id) return;
    if (!this.state._nextFree) return;
    this.state._nextFree = false;
  }
}

registerEffect(NextSkillFreeCost);
