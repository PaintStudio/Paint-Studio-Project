import { Effect, registerEffect } from '../../effectSystem';

class ScentSystem extends Effect {
  static ID = 219;
  onTakeDamage({ owner, unit, damage }) {
    if (owner.id !== unit.id) return;
    const threshold = owner.maxHp * (this.params[0] || 0.05);
    this.state._dmgAccum = (this.state._dmgAccum || 0) + damage;
    if (this.state._dmgAccum < threshold) return;
    const gained = Math.floor(this.state._dmgAccum / threshold);
    this.state._dmgAccum -= gained * threshold;
    const cur = (unit.combatStacks || {})._scentStacks || 0;
    return {
      combatStackUpdates: { _scentStacks: cur + gained },
      log: `  [달이 빚어낸 기회] ${unit.name}: 선향 ${gained}스택 획득 (합계 ${cur + gained})`,
    };
  }
  modifyDebuffTurns(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'debuff') return;
    const stacks = (unit.combatStacks || {})._scentStacks || 0;
    if (stacks <= 0) return;
    this.state._consumeScent = true;
    return value + 1;
  }
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'debuff') return;
    if (!this.state._consumeScent) return;
    this.state._consumeScent = false;
    const cur = (unit.combatStacks || {})._scentStacks || 0;
    if (cur <= 0) return;
    return {
      combatStackUpdates: { _scentStacks: cur - 1 },
      log: `  [달이 빚어낸 기회] ${unit.name}: 선향 1스택 소모 → 디버프 지속시간 +1`,
    };
  }
}

registerEffect(ScentSystem);
