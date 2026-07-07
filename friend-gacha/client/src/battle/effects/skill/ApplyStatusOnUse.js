import { Effect, registerEffect } from '../../effectSystem';

// 스킬 사용 시 대상에게 상태이상 부여
// args: [statusKey, displayName, turns]  예) ["light_vulnerability", "광 속성 취약", 1]
class ApplyStatusOnUse extends Effect {
  static ID = 321;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const statusKey = this.params[0];
    const displayName = this.params[1] || statusKey;
    const turns = this.params[2] ?? 2;

    const extra = {};
    if (this.params[3] != null) extra.atkRatio = this.params[3];

    return {
      applyStatuses: targets.map(t => ({
        targetId: t.id,
        statusKey,
        displayName,
        turns,
        casterId: owner.id,
        params: [],
        ...extra,
      })),
      log: `  ${targets.map(t => t.name).join(', ')}: ${displayName} (${turns >= 99 ? '영구' : turns + '턴'})`,
    };
  }
}

registerEffect(ApplyStatusOnUse);
