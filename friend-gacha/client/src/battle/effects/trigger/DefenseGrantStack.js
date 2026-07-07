import { Effect, registerEffect, mapType, getEffStat } from '../../effectSystem';

class DefenseGrantStack extends Effect {
  static ID = 105;
  onDefenseUsed({ owner, defender, attacker }) {
    if (owner.id !== defender.id) return;
    const cur = this.getStack(attacker, this.params[0]);
    if (cur >= this.params[1]) return;
    return {
      attackerStackUpdates: { [this.params[0]]: cur + 1, [`_${this.params[0]}_ownerId`]: defender.id },
      log: `  [${defender.talent.name}] ${attacker.name}에게 ${this.params[0]} 부여`
    };
  }
  onAttackHit({ targets, owner }) {
    if (!this.params[2]) return;
    const hits = [];
    for (const target of targets) {
      const stacks = this.getStack(target, this.params[0]);
      if (stacks <= 0) continue;
      const bonusDmg = Math.round(getEffStat(owner, 'atk') * this.params[3]);
      hits.push({ targetId: target.id, damage: bonusDmg, element: this.params[4], stackConsume: { [this.params[0]]: Math.max(0, stacks - 1) } });
    }
    if (!hits.length) return;
    return {
      bonusDamage: hits,
      logs: hits.map(h => `  [${owner.talent.name}] ${this.params[0]} 소모 → ${h.damage} ${this.params[4]} 피해`)
    };
  }
}

registerEffect(DefenseGrantStack);
mapType('defense_grant_stack', 105);
