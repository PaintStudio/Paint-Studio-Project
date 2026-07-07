import { Effect, registerEffect, extendBuffs, reduceDebuffs } from '../../effectSystem';

// 아군 전체 버프 연장 + 디버프 진행 + 스택 조절
// args: [buffExtend, debuffReduce, goodStackInc, badStackDec]  예) [1, 1, 1, 1]
const GOOD_STACKS = ['_illusionStacks', '_encoreStacks', '_originStacks', '_babelStacks', '_swiftStacks', '_darkArmsStacks', '_bondStacks', '_stealthStacks', '_starflowerStacks', '_tauntStacks'];
const BAD_STACKS = ['_stormStacks', '_collapseStacks'];

class TimeManipulation extends Effect {
  static ID = 316;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const buffExt = this.params[0] ?? 1;
    const debuffRed = this.params[1] ?? 1;
    const goodInc = this.params[2] ?? 1;
    const badDec = this.params[3] ?? 1;

    const logs = [];
    const stackUpdates = [];

    for (const tgt of targets) {
      extendBuffs(tgt.id, buffExt);
      reduceDebuffs(tgt.id, debuffRed);

      const cs = { ...(tgt.combatStacks || {}) };
      let changed = false;
      for (const key of GOOD_STACKS) {
        if ((cs[key] || 0) > 0) { cs[key] = (cs[key] || 0) + goodInc; changed = true; }
      }
      for (const key of BAD_STACKS) {
        if ((cs[key] || 0) > 0) { cs[key] = Math.max(0, (cs[key] || 0) - badDec); changed = true; }
      }
      if (changed) stackUpdates.push({ targetId: tgt.id, stacks: cs });

      logs.push(`  ${tgt.name}: 버프 +${buffExt}턴, 디버프 -${debuffRed}턴, 스택 조절`);
    }

    return {
      partyStackUpdates: stackUpdates.length > 0 ? stackUpdates : undefined,
      logs,
    };
  }
}

registerEffect(TimeManipulation);
