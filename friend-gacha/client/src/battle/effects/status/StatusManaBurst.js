import { Effect, registerEffect, mapStatus } from '../../effectSystem';

// 마나 폭주 상태: 받는 피해 감소 + 과부하 감소 + 크리티컬 시 회복
// params: [healRatio, olReduce, dmgReduce]  예) [0.15, 1, 0.5]
class StatusManaBurst extends Effect {
  static ID = 216;

  calcDamageReduction(value, { owner, defender }) {
    if (owner.id !== defender.id) return;
    return value + (this.params[2] || 0.5);
  }

  modifyOverloadInc(value, { owner, unit }) {
    if (owner.id !== unit.id) return;
    return Math.max(0, value - (this.params[1] || 1));
  }

  onCrit({ owner, attacker }) {
    if (owner.id !== attacker.id) return;
    const healAmt = Math.round(owner.maxHp * (this.params[0] || 0.15));
    return {
      selfHeal: healAmt,
      log: `  [마나 폭주] ${owner.name}: 크리티컬! HP ${healAmt} 회복`,
    };
  }
}

registerEffect(StatusManaBurst);
mapStatus('mana_burst', 216);
