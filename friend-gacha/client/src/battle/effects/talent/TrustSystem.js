import { Effect, registerEffect } from '../../effectSystem';

// HP 손실 누적 → 신뢰 스택, 회복 스킬 시 노트 비소모 확률
// args: [hpThreshold, chancePerStack, maxStacks]  예) [0.1, 0.03, 10]
class TrustSystem extends Effect {
  static ID = 169;

  onTakeDamage({ owner, unit, damage }) {
    if (owner.id !== unit.id) return;
    const threshold = unit.maxHp * (this.params[0] || 0.1);
    const maxStacks = this.params[2] || 10;
    const curStacks = (unit.combatStacks || {})._trustStacks || 0;
    if (curStacks >= maxStacks) return;

    const accum = (this.state._hpLossAccum || 0) + damage;
    if (accum >= threshold) {
      const gained = Math.min(Math.floor(accum / threshold), maxStacks - curStacks);
      this.state._hpLossAccum = accum - gained * threshold;
      return {
        combatStackUpdates: { _trustStacks: curStacks + gained },
        log: `  [고통 속 신뢰] ${unit.name}: 신뢰 +${gained} (${curStacks + gained}스택)`,
      };
    }
    this.state._hpLossAccum = accum;
  }

  onSkillUsed({ owner, unit, skill, actualCost }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'heal') return;
    const stacks = (unit.combatStacks || {})._trustStacks || 0;
    if (stacks <= 0 || !actualCost) return;
    const chance = stacks * (this.params[1] || 0.03);
    if (Math.random() < chance) {
      return {
        noteRecoverUncapped: actualCost,
        log: `  [고통 속 신뢰] ${unit.name}: 신뢰 발동! 턴 노트 ${actualCost} 환급`,
      };
    }
  }
}

registerEffect(TrustSystem);
