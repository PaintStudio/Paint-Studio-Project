import { Effect, registerEffect } from '../../effectSystem';

// 매개저주학 박사 (칸나)
// 자신에게 디버프가 부여/연장될 때마다 노트 1 회복, HP가 args[1]% 이하면 ATK의 args[0]%만큼 회복
// args: [healRatio, hpThreshold]
// hook: onReceiveDebuff
class DebuffReceivedRecover extends Effect {
  static ID = 227;
  onReceiveDebuff({ owner, unit }) {
    if (owner.id !== unit.id || !unit.alive) return;
    const results = { noteRecoverUncapped: 1, log: `  [${unit.talent?.name}] ${unit.name} 노트 +1` };
    const threshold = this.params[1] ?? 0.5;
    if (unit.hp / unit.maxHp <= threshold) {
      const healAmt = Math.round(unit.atk * (this.params[0] ?? 0.5));
      results.selfHeal = healAmt;
      results.log += `, HP ${healAmt} 회복`;
    }
    return results;
  }
}

registerEffect(DebuffReceivedRecover);
