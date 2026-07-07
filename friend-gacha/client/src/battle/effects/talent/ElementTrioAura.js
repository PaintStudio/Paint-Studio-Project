import { Effect, registerEffect } from '../../effectSystem';

// 파티에 지정 속성이 모두 있으면 전체 아군 ATK 증가 (파티 오라)
// args: [elem1, elem2, elem3, atkBoost]  예) ["fire","water","wind", 0.5]
class ElementTrioAura extends Effect {
  static ID = 174;
  modifyStat(value, { owner, stat, party }) {
    if (stat !== 'atk') return;
    if (!owner.alive) return;
    const required = [this.params[0], this.params[1], this.params[2]].filter(Boolean);
    const elements = new Set((party || []).filter(u => u.alive).map(u => u.element));
    if (!required.every(e => elements.has(e))) return;
    return Math.round(value * (1 + (this.params[3] || 0.5)));
  }
}

registerEffect(ElementTrioAura);
