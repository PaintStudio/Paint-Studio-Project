import { Effect, registerEffect, getEffStat } from '../../effectSystem';

// 천재 백마법사 (칸나)
// 치유 스킬의 턴 노트 소모 0. 치유 사용시 (원래 비용 × args[0])% maxHP를 잃는다. 자신 회복 불가.
// args: [hpCostPerNote]  예) [0.05] → 비용 × 5% maxHP
class FreeHealHpCost extends Effect {
  static ID = 229;
  static PRIORITY = 100;

  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type === 'heal') return 0;
  }

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'heal') return;
    const costPerNote = this.params[0] ?? 0.05;
    const hpLoss = Math.round(unit.maxHp * costPerNote * skill.cost);
    if (hpLoss <= 0) return;
    return {
      selfDamage: hpLoss,
      log: `  [${unit.talent?.name}] ${unit.name}: HP ${hpLoss} 소모 (치유 대가)`
    };
  }

  modifyHealAmount(value, { caster, target, owner }) {
    if (owner.id !== target?.id) return;
    if (caster?.id === target?.id) return 0;
  }
}

registerEffect(FreeHealHpCost);
