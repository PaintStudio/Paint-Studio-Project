import { Effect, registerEffect, mapType } from '../../effectSystem';

class BleachStack extends Effect {
  static ID = 112;
  onSkillUsed({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const cur = this.getStack(unit, '_bleach');
    if (cur < this.params[0]) {
      return {
        combatStackUpdates: { _bleach: cur + 1 },
        log: `  [${unit.talent.name}] 탈색 ${cur + 1}스택`
      };
    }
  }
  onAttackHit({ attacker, owner, targets }) {
    if (attacker.id !== owner.id) return;
    const stacks = this.getStack(attacker, '_bleach');
    if (stacks <= 0) return;
    const amount = stacks * this.params[1];
    return {
      applyDebuff: targets.map(t => ({
        targetId: t.id,
        debuff: { stat: 'atk', amount, turns: this.params[2], skillId: `talent_bleach_${owner.id}`, skillName: owner.talent.name }
      })),
      attackerStackUpdates: { _bleach: 0 },
      log: `  [${owner.talent.name}] 탈색 ${stacks}스택 소모 → ATK ${Math.round(amount * 100)}% 감소 (${this.params[2]}턴)`
    };
  }
}

registerEffect(BleachStack);
mapType('bleach_stack', 112);
