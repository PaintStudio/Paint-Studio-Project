import { Effect, registerEffect } from '../../effectSystem';

// 같은 스킬 사이클 중 1회만 사용 가능 + 쿨타임 감소 + 최대 노트 증가
// args: [cdReduce, noteBoost]  예) [3, 10]
class SkillUseOnce extends Effect {
  static ID = 180;

  onFirstCycle({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const noteBoost = this.params[1] || 10;
    return {
      maxNoteReduce: -noteBoost,
      log: `  [어둠 속에 피는 빛] ${unit.name}: 최대 턴 노트 +${noteBoost}`,
    };
  }

  modifyBaseCooldown(value, { owner, unit }) {
    if (owner.id !== unit.id) return;
    const cdReduce = this.params[0] || 3;
    return Math.max(0, value - cdReduce);
  }

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (!this.state._usedSkills) this.state._usedSkills = [];
    if (skill?.id != null) this.state._usedSkills.push(skill.id);
  }

  modifyCanUse(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (!value) return;
    if (!this.state._usedSkills?.length) return;
    if (this.state._usedSkills.includes(skill?.id)) return false;
  }

  onCycleEnd({ owner, unit }) {
    if (owner.id !== unit.id) return;
    this.state._usedSkills = [];
  }
}

registerEffect(SkillUseOnce);
