import { Effect, registerEffect } from '../../effectSystem';

// 특정 태그를 가진 캐릭터의 치명타 피해 증가 (파티 오라)
// args: [tagLabel, amount]  예) ['그린네시아', 0.5]
class TagCritDmgBoost extends Effect {
  static ID = 161;
  modifyCritMult(value, { owner, attacker }) {
    if (!owner.alive) return;
    if (!attacker.tags?.some(t => t.label === this.params[0])) return;
    return value + (this.params[1] || 0.5);
  }
}

registerEffect(TagCritDmgBoost);
