import { Effect, registerEffect } from '../../effectSystem';

// 디버프 스킬 사용 시 영광 획득, 염 속성 공격 시 영광 전소모
// args: []
class GloryOnDebuff extends Effect {
  static ID = 166;

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    const cur = (unit.combatStacks || {})._gloryStacks || 0;

    if (skill?.type === 'debuff') {
      return {
        combatStackUpdates: { _gloryStacks: cur + 1 },
        log: `  [엘더드라고] ${unit.name}: 영광 ${cur + 1}스택`,
      };
    }

    if (skill?.type === 'attack' && skill?.element === 'fire' && cur > 0) {
      return {
        combatStackUpdates: { _gloryStacks: 0 },
        log: `  [엘더드라고] ${unit.name}: 영광 ${cur}스택 소모`,
      };
    }
  }
}

registerEffect(GloryOnDebuff);
