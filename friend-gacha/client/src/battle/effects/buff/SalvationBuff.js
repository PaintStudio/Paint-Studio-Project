import { Effect, registerEffect } from '../../effectSystem';

// 구원 버프: 피격 시 HP 회복
// args: [회복량] (addBuff에서 전달)
class SalvationBuff extends Effect {
  static ID = 403;

  onTakeDamage({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const healAmt = this.params[0];
    if (!healAmt || healAmt <= 0) return;
    return {
      healAmount: healAmt,
      log: `  [구원] ${unit.name} HP ${healAmt} 회복`
    };
  }
}

registerEffect(SalvationBuff);
