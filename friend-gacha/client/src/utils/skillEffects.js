/**
 * 스킬 효과 핸들러 레지스트리
 *
 * 스킬의 extra.effects 배열을 통해 유연한 효과 조합 가능.
 * 예: { "effects": [{ "type": "noteRecover", "amount": 3 }] }
 *
 * 각 핸들러는 (ctx, params) => mutation[] 형태.
 * ctx: { caster, targets, allies, enemies }
 * params: effects 배열의 해당 항목 (type 포함)
 * scope: 'target'(기본) | 'self' | 'party' | 'enemies' — 효과 적용 대상
 */

const effectHandlers = {};

function registerEffect(type, handler) {
  effectHandlers[type] = handler;
}

function resolveTargets(scope, ctx) {
  switch (scope) {
    case 'self': return [ctx.caster];
    case 'party': return ctx.allies.filter(u => u.alive);
    case 'enemies': return ctx.enemies.filter(u => u.alive);
    default: return ctx.targets.filter(u => u && u.alive);
  }
}

// 턴 노트 회복
registerEffect('noteRecover', (ctx, params) => {
  const targets = resolveTargets(params.scope, ctx);
  return targets.map(t => ({
    mut: 'recoverNotes', targetId: t.id, amount: params.amount,
    log: `  → ${t.name}: 턴 노트 ${params.amount} 회복`,
  }));
});

// HP 회복 (maxHp 비율)
registerEffect('healPercent', (ctx, params) => {
  const targets = resolveTargets(params.scope, ctx);
  return targets.map(t => {
    const amt = Math.round(t.maxHp * params.percent);
    return {
      mut: 'healHp', targetId: t.id, amount: amt,
      log: `  → ${t.name}: HP ${amt} 회복 (${Math.round(params.percent * 100)}%)`,
    };
  });
});

// 버프 부여
registerEffect('buff', (ctx, params) => {
  const targets = resolveTargets(params.scope, ctx);
  const turns = params.turns || 3;
  return targets.map(t => ({
    mut: 'addBuff', targetId: t.id,
    stat: params.stat, amount: params.amount, turns,
    skillId: ctx.skill?.id, skillName: ctx.skill?.name,
    log: `  → ${t.name}: ${params.stat.toUpperCase()} ${Math.round(params.amount * 100)}% 증가 (${turns}턴)`,
  }));
});

// 디버프 부여
registerEffect('debuff', (ctx, params) => {
  const targets = resolveTargets(params.scope, ctx);
  const turns = params.turns || 3;
  return targets.map(t => ({
    mut: 'addDebuff', targetId: t.id,
    stat: params.stat, amount: params.amount, turns,
    skillId: ctx.skill?.id, skillName: ctx.skill?.name,
    log: `  → ${t.name}: ${params.stat.toUpperCase()} ${Math.round(params.amount * 100)}% 감소 (${turns}턴)`,
  }));
});

// 디버프 해제
registerEffect('cleanse', (ctx, params) => {
  const targets = resolveTargets(params.scope || 'target', ctx);
  const count = params.count || 99;
  return targets.map(t => ({
    mut: 'cleanse', targetId: t.id, count,
    log: `  → ${t.name}: 디버프 해제`,
  }));
});

// 좌표 마크 (아군 행동 시 추가 피해)
registerEffect('mark', (ctx, params) => {
  const targets = resolveTargets(params.scope, ctx);
  const turns = params.turns || 2;
  return targets.map(t => ({
    mut: 'addMark', targetId: t.id,
    casterId: ctx.caster.id,
    atkSnapshot: ctx.caster.atk,
    damageRatio: params.damageRatio || 0.1,
    element: params.element || ctx.caster.element,
    turns,
    log: `  → ${t.name}: 좌표 고정 (${turns}턴)`,
  }));
});

// 특수 상태이상 부여 (수몰 등)
registerEffect('applyStatus', (ctx, params) => {
  const targets = resolveTargets(params.scope || 'enemies', ctx);
  const turns = params.turns || 2;
  const skillExtra = ctx.skillExtra || {};
  return targets.map(t => ({
    mut: 'addStatus', targetId: t.id,
    statusKey: params.statusKey,
    displayName: params.displayName || params.statusKey,
    turns,
    casterId: ctx.caster.id,
    atkRatio: skillExtra[params.statusKey]?.atkRatio,
    log: `  → ${t.name}: ${params.displayName || params.statusKey} (${turns >= 99 ? '영구' : turns + '턴'})`,
  }));
});

// 적 버프 해제
registerEffect('dispel', (ctx, params) => {
  const targets = resolveTargets(params.scope || 'target', ctx);
  const count = params.count || 99;
  return targets.map(t => ({
    mut: 'dispel', targetId: t.id, count,
    log: `  → ${t.name}: 버프 해제`,
  }));
});

function processEffects(effects, ctx) {
  const mutations = [];
  for (const eff of effects) {
    const handler = effectHandlers[eff.type];
    if (!handler) {
      console.warn(`알 수 없는 효과 타입: ${eff.type}`);
      continue;
    }
    mutations.push(...handler(ctx, eff));
  }
  return mutations;
}

export { effectHandlers, registerEffect, processEffects };
