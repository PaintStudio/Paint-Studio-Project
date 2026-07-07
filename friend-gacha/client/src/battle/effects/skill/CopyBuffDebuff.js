import { Effect, registerEffect, getBuffs, getDebuffs, addBuff, addDebuff } from '../../effectSystem';

// 대상의 버프/디버프를 복사하여 자신에게 적용
// args: []
class CopyBuffDebuff extends Effect {
  static ID = 344;
  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;
    const target = targets[0];
    if (target.id === unit.id) return;

    const tgtBuffs = getBuffs(target.id);
    const tgtDebuffs = getDebuffs(target.id);
    const logs = [];

    for (const b of tgtBuffs) {
      addBuff(unit.id, b.effectId, b.args, { turns: b.turns, skillId: b.skillId, skillName: b.skillName, casterId: b.casterId, label: b.label });
    }
    if (tgtBuffs.length) logs.push(`  ${unit.name}: ${target.name}의 버프 ${tgtBuffs.length}개 복사`);

    for (const d of tgtDebuffs) {
      addDebuff(unit.id, d.effectId, d.args, { turns: d.turns, skillId: d.skillId, skillName: d.skillName, casterId: d.casterId, label: d.label });
    }
    if (tgtDebuffs.length) logs.push(`  ${unit.name}: ${target.name}의 디버프 ${tgtDebuffs.length}개 복사`);

    if (!logs.length) logs.push(`  ${target.name}에게 복사할 버프/디버프 없음`);
    return { logs };
  }
}

registerEffect(CopyBuffDebuff);
