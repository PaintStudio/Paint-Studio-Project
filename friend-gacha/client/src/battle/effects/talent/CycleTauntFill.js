import { Effect, registerEffect } from '../../effectSystem';

// 경계를 넘은 소녀 (칸나)
// 매 사이클 개시시, 도발이 args[0]스택 미만이면 채우고, 획득한 스택당 maxHP의 args[1]% HP를 잃는다
// args: [minTaunt, hpLossRatio]
class CycleTauntFill extends Effect {
  static ID = 226;
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id || !unit.alive) return;
    const min = this.params[0] ?? 3;
    const cur = this.getStack(unit, '_tauntStacks');
    if (cur >= min) return;
    const gained = min - cur;
    const hpLoss = Math.round(unit.maxHp * (this.params[1] ?? 0.1) * gained);
    return {
      combatStackUpdates: { _tauntStacks: min },
      selfDamage: hpLoss,
      log: `  [${unit.talent?.name}] ${unit.name} 도발 ${gained}스택 획득, HP ${hpLoss} 소모`
    };
  }
}

registerEffect(CycleTauntFill);
