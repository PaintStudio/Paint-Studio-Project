import gameConfig from '@gameConfig';
import { attachBuff, attachDebuff, cleanse, getEffStat, getBuffs, getDebuffs } from './effectSystem';

// ═══════════════════════════════════════════════════
//  전투 스택 표시 레지스트리
//  새 전투 스택 추가 시 여기만 등록하면 renderUnit에 자동 표시
// ═══════════════════════════════════════════════════

const STACK_REGISTRY = {
  _tauntStacks:    { label: '도발', icon: '/images/stacks/taunt.png', emoji: '\u{1F6E1}', cls: 'taunt', count: true },
  _encoreStacks:   { label: '앵콜', icon: '/images/stacks/encore.png', emoji: '\u{1F501}', cls: 'encore', count: true },
  _stealthStacks:  { label: '은신', icon: '/images/stacks/stealth.png', emoji: '\u{1F47B}', cls: 'buff', count: true },
  _illusionStacks: { label: '환영', icon: '/images/stacks/illusion.png', emoji: '\u{1F300}', cls: 'illusion', count: true },
  _prepared:       { label: '프리페어', icon: '/images/stacks/prepare.png', emoji: '⚡', cls: 'buff', count: false },
  _originStacks:   { label: '근원', icon: '/images/stacks/origin.png', emoji: '✦', cls: 'buff', count: true },
  _babelStacks:    { label: '바벨', icon: '/images/stacks/babel.png', emoji: '\u{1F3DB}', cls: 'buff', count: true },
  _stormStacks:    { label: '폭풍', icon: '/images/stacks/storm.png', emoji: '\u{1F32A}', cls: 'debuff', count: true },
  _collapseStacks: { label: '붕괴', icon: '/images/stacks/collapse.png', emoji: '\u{1F4A5}', cls: 'debuff', count: true },
  _swiftStacks:    { label: '신속', icon: '/images/stacks/swift.png', emoji: '\u{1F4A8}', cls: 'buff', count: true },
  _darkArmsStacks: { label: '검은 무장', icon: '/images/stacks/darkarms.png', emoji: '⚔', cls: 'buff', count: true },
  _bondStacks:     { label: '결속', icon: '/images/stacks/bond.png', emoji: '\u{1F517}', cls: 'buff', count: true },
  _starflowerStacks: { label: '별꽃', icon: '/images/stacks/starflower.png', emoji: '✨', cls: 'buff', count: true },
  _swordUnityDmg:  { label: '검아일체', icon: '/images/stacks/swordunity.png', emoji: '\u{1F5E1}', cls: 'buff', count: true, source: 'tracker' },
  _echoStacks:     { label: '울림', icon: '/images/stacks/echo.png', emoji: '\u{1F514}', cls: 'buff', count: true },
  _masteryStacks:  { label: '숙련', icon: '/images/stacks/mastery.png', emoji: '\u{1F3AF}', cls: 'buff', count: true },
  _soulStacks:     { label: '영혼', icon: '/images/stacks/soul.png', emoji: '\u{1F47B}', cls: 'buff', count: false },
  _gloryStacks:    { label: '영광', icon: '/images/stacks/glory.png', emoji: '\u{1F525}', cls: 'buff', count: true },
  _knowledgeStacks:{ label: '지식', icon: '/images/stacks/knowledge.png', emoji: '\u{1F4D6}', cls: 'buff', count: true },
  _trustStacks:    { label: '신뢰', icon: '/images/stacks/trust.png', emoji: '\u{1F91D}', cls: 'buff', count: true },
  _meiOverload:    { label: '과부하', icon: '/images/stacks/overload.png', emoji: '⚡', cls: 'debuff', count: true },
  _hornStacks:     { label: '호각', icon: '/images/stacks/horn.png', emoji: '\u{1F3BA}', cls: 'buff', count: true },
  _fervorStacks:   { label: '고조', icon: '/images/stacks/fervor.png', emoji: '\u{1F525}', cls: 'buff', count: true },
  _foodStacks:     { label: '음식', icon: '/images/stacks/food.png', emoji: '\u{1F372}', cls: 'buff', count: true },
  _scentStacks:    { label: '선향', icon: '/images/stacks/scent.png', emoji: '\u{1F338}', cls: 'buff', count: true },
  _farewellStacks: { label: '작별', icon: '/images/stacks/farewell.png', emoji: '\u{1F44B}', cls: 'debuff', count: true },
  _revelationStacks: { label: '계시', icon: '/images/stacks/revelation.png', emoji: '\u{2728}', cls: 'buff', count: false },
};

function getActiveStacks(unit) {
  const result = [];
  for (const [key, sd] of Object.entries(STACK_REGISTRY)) {
    const val = sd.source === 'tracker'
      ? (unit.hpLostTrackers || {})[key]
      : (unit.combatStacks || {})[key];
    if (sd.count ? (val || 0) > 0 : !!val) {
      result.push({ ...sd, key, value: sd.source === 'tracker' ? Math.round(val) : val });
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════
//  스킬 extra 키 → 툴팁 설명 레지스트리
//  새 extra 키 추가 시 여기 등록하면 스킬 툴팁에 자동 표시
// ═══════════════════════════════════════════════════

const TOOLTIP_REGISTRY = {
  buff: (v) => ({ cls: 'buff', label: 'buff', desc: `${v.stat?.toUpperCase()} ${Math.round((v.amount || 0) * 100)}% 증가 (${v.turns || 3}턴)` }),
  alsoHeal: (v) => ({ cls: 'healPercent', label: 'heal', desc: `공격 시 HP ${Math.round(v * 100)}% 회복` }),
  counter: () => ({ cls: 'buff', label: 'counter', desc: '반격' }),
  ignoreDef: () => ({ cls: 'debuff', label: 'ignoreDef', desc: '방어력 무시' }),
  conditionalDefense: (v) => ({ cls: 'buff', label: 'condDef', desc: `조건부 방어 (${Math.round((v.defense_mult || 0) * 100)}% 감소)` }),
  illusion_gain: (v) => ({ cls: 'illusion', label: '환영', desc: `환영 ${v}스택 획득` }),
  ally_heal_ratio: (v) => ({ cls: 'healPercent', label: '아군 회복', desc: `아군 지정 시 피해량의 ${Math.round(v * 100)}% 회복` }),
  consume_illusion: (v, extra) => ({ cls: 'illusion', label: '환영 소모', desc: `환영 전소모, 스택당 +${Math.round((extra?.power_per_stack || 0.25) * 100)}%p 위력` }),
  taunt_gain: (v) => ({ cls: 'taunt', label: '도발', desc: `도발 ${v}스택 획득` }),
  next_cycle_spd_buff: (v) => ({ cls: 'buff', label: 'SPD 버프', desc: `다음 사이클 SPD ${Math.round(v.amount * 100)}% 증가 (${v.turns}턴)` }),
  noteRestore: (v) => ({ cls: 'buff', label: '노트 회복', desc: `턴 노트 ${v} 회복` }),
  noteRestoreIfZero: (v) => ({ cls: 'buff', label: '노트 회복', desc: `노트 0인 아군 턴 노트 ${v} 회복` }),
  grantExtraTurn: () => ({ cls: 'buff', label: '추가 턴', desc: '대상에게 추가 턴 부여' }),
  selfHeal: (v) => ({ cls: 'healPercent', label: '자가 회복', desc: `HP ${Math.round(v * 100)}% 회복` }),
  hpCost: (v) => ({ cls: 'debuff', label: 'HP 소모', desc: `최대 HP ${Math.round(v * 100)}% 소모` }),
  deflect: (v) => ({ cls: 'buff', label: '튕겨내기', desc: `HP ${Math.round(v.hpThreshold * 100)}% 이하 피해 무효화` }),
  encore_grant: (v) => ({ cls: 'encore', label: '앵콜', desc: `앵콜 ${v}스택 부여 (공격 반복)` }),
  shield: (v) => ({ cls: 'buff', label: '보호막', desc: `ATK ${Math.round(v.atkRatio * 100)}% 보호막 부여` }),
  cleanse_def_debuff: (v) => ({ cls: 'buff', label: '해제', desc: `DEF 감소 디버프 ${v}개 해제` }),
  bonus_taunt_on_prior_defense: (v) => ({ cls: 'taunt', label: '추가 도발', desc: `이전 방어 시 도발 +${v}스택` }),
  attackCountCostReduce: (v) => ({ cls: 'buff', label: '코스트 감소', desc: `사이클 공격 횟수당 코스트 -${v}` }),
  prepare: (v) => ({ cls: 'buff', label: '프리페어', desc: `다음 공격 데미지 x${v.damageMult}, 코스트 x${v.costMult}` }),
  ignore_overload: () => ({ cls: 'buff', label: '과부하 무시', desc: '이 스킬은 과부하 영향을 받지 않음' }),
  storm_stacks: (v) => ({ cls: 'debuff', label: '폭풍', desc: `폭풍 ${v}스택 부여 (풍 피해 +25%/스택, 풍 피해시 1소모)` }),
  party_ignore_def: (v) => ({ cls: 'buff', label: '방어 관통', desc: `아군 전체 방어 관통 ${Math.round(v.amount * 100)}% (${v.turns}사이클)` }),
  cd_reduce_on_buff: () => ({ cls: 'buff', label: '쿨다운 감소', desc: '버프 스킬 사용시 이 스킬 쿨다운 -1' }),
  cycle_taunt_grant: (v) => ({ cls: 'buff', label: '도발 부여', desc: `매 사이클 개시시 도발 ${v.stacks}스택 (${v.turns}사이클)` }),
  light_damage_boost: (v) => ({ cls: 'buff', label: '광 피해 증가', desc: `광 속성 피해 +${Math.round(v.amount * 100)}% (${v.turns}사이클)` }),
};

const EFFECT_TOOLTIP_REGISTRY = {
  304: (args) => ({ cls: 'buff', label: `${(args[0] || 'ATK').toUpperCase()} 증가`, desc: `${(args[0] || 'ATK').toUpperCase()} ${Math.round((args[1] || 0) * 100)}% 증가 (${args[2] || 3}턴)` }),
  307: (args) => ({ cls: 'buff', label: '구원', desc: `대상 피격 시 ATK ${Math.round((args[0] || 0.75) * 100)}% 회복 (${args[1] || 2}사이클)` }),
  308: (args) => ({ cls: 'debuff', label: `${(args[0] || 'DEF').toUpperCase()} 감소`, desc: `${(args[0] || 'DEF').toUpperCase()} ${Math.round((args[1] || 0) * 100)}% 감소 (${args[2] || 3}턴)` }),
  309: (args) => ({ cls: 'debuff', label: '좌표 고정', desc: `좌표 마크 (${args[2] || 2}턴, ${Math.round((args[0] || 0.1) * 100)}% ${args[1] || ''})` }),
  310: (args) => ({ cls: 'buff', label: '조건부 방어', desc: args[0] === 'attacker_slower' ? `대상이 느리면 ${Math.round((args[1] || 0.6) * 100)}% 경감` : '조건부 방어' }),
  311: (args) => ({ cls: 'buff', label: '방어 관통', desc: `아군 전체 방어 관통 ${Math.round((args[0] || 0.5) * 100)}% (${args[1] || 2}사이클)` }),
  312: () => ({ cls: 'buff', label: '쿨다운 감소', desc: '버프 스킬 사용시 이 스킬 쿨다운 -1' }),
  313: (args) => ({ cls: 'buff', label: '도발 부여', desc: `매 사이클 개시시 도발 ${args[0] || 2}스택 (${args[1] || 3}사이클)` }),
  314: (args) => ({ cls: 'buff', label: '광 피해 증가', desc: `광 속성 피해 +${Math.round((args[0] || 0.5) * 100)}% (${args[1] || 3}사이클)` }),
  315: () => ({ cls: 'buff', label: '추가 턴', desc: '대상에게 추가 턴 부여' }),
  316: (args) => ({ cls: 'buff', label: '시간 조작', desc: `버프 +${args[0] || 1}턴, 디버프 -${args[1] || 1}턴, 스택 조절` }),
  317: (args) => ({ cls: 'buff', label: '크리티컬 증가', desc: `크리티컬 +${Math.round((args[0] || 0.2) * 100)}% (${args[1] || 3}사이클)` }),
  126: (args) => ({ cls: 'buff', label: '코스트 감소', desc: `사이클 공격 횟수당 코스트 -${args[0] || 1}` }),
  127: (args) => ({ cls: 'buff', label: '프리페어', desc: `다음 공격 데미지 x${args[1] || 2}, 코스트 x${args[0] || 2}` }),
  318: (args) => ({ cls: 'buff', label: '활력 주입', desc: `ATK +${Math.round((args[0] || 0.25) * 100)}%, 스킬 시 HP ${Math.round((args[1] || 0.33) * 100)}% ATK 회복 (${args[2] || 5}턴)` }),
  319: () => ({ cls: 'buff', label: '과부하 무시', desc: '이 스킬은 과부하 영향을 받지 않음' }),
  320: (args) => ({ cls: 'debuff', label: '폭풍', desc: `폭풍 ${args[0] || 2}스택 부여 (풍 피해 +25%/스택, 풍 피해시 1소모)` }),
  321: (args) => ({ cls: 'debuff', label: args[1] || '상태이상', desc: `${args[1] || args[0]} (${args[2] || 2}턴)` }),
  322: (args) => ({ cls: 'illusion', label: '환영', desc: `환영 ${args[0] || 1}스택 획득` }),
  323: (args) => ({ cls: 'healPercent', label: '아군 회복', desc: `아군 지정 시 피해량의 ${Math.round((args[0] || 0.5) * 100)}% 회복` }),
  324: (args) => ({ cls: 'illusion', label: '환영 소모', desc: `환영 전소모, 스택당 +${Math.round((args[0] || 0.25) * 100)}%p 위력` }),
  325: (args) => ({ cls: 'buff', label: 'SPD 버프', desc: `다음 사이클 SPD ${Math.round((args[0] || 0.15) * 100)}% 증가 (${args[1] || 1}턴)` }),
  326: (args) => ({ cls: 'buff', label: '노트 흡수', desc: `대상 최대 노트의 ${Math.round((args[0] || 0.1) * 100)}% 흡수${args[1] ? ' (노트 0 필수)' : ''}` }),
  327: (args) => ({ cls: 'buff', label: '아군 노트 회복', desc: `노트 최저 아군 노트 ${args[0] || 2} 회복` }),
  328: (args) => ({ cls: 'buff', label: '울림 부여', desc: `울림 ${args[0] || 4}스택 부여 (공격 시 ATK 150% 추가 피해)` }),
  329: (args) => ({ cls: 'buff', label: '보호막', desc: `ATK ${Math.round((args[0] || 1.5) * 100)}% 보호막 부여` }),
  330: (args) => ({ cls: 'taunt', label: '도발 부여', desc: `도발 ${args[0] || 1}스택 (자신 ${args[1] || 3}스택)` }),
  331: (args) => ({ cls: 'buff', label: '피해→보호막', desc: `입힌 피해의 ${Math.round((args[0] || 0.25) * 100)}% 보호막` }),
  332: (args) => ({ cls: 'buff', label: '디버프 제거', desc: `디버프 ${args[0] || 1}종 제거` }),
  333: (args) => ({ cls: 'buff', label: '튕겨내기', desc: `최대 HP ${Math.round((args[0] || 0.1) * 100)}% 이하 피해 무효화` }),
  334: (args) => ({ cls: 'buff', label: '노트 회복', desc: `노트 0인 아군 턴 노트 ${args[0] || 5} 회복` }),
  335: (args) => ({ cls: 'taunt', label: '수호 도발', desc: `도발 ${args[0] || 1}스택, 이전 방어 시 +${args[1] || 2}스택` }),
  336: (args) => ({ cls: 'buff', label: 'DEF 디버프 해제', desc: `${(args[0] || 'DEF').toUpperCase()} 감소 디버프 해제` }),
  337: (args) => ({ cls: 'buff', label: '치명타 피해 증가', desc: `치명타 피해 +${Math.round((args[0] || 0.15) * 100)}% (${args[1] || 1}사이클)` }),
  338: (args) => ({ cls: 'healPercent', label: '성화만개', desc: `${args[1] || 3}사이클간 스킬 사용 시 ATK ${Math.round((args[0] || 0.35) * 100)}% 회복` }),
  339: (args) => ({ cls: 'illusion', label: '환영 부여', desc: `대상에게 환영 ${args[0] || 1}스택 부여` }),
  340: (args) => ({ cls: 'buff', label: 'DEF 버프+회복', desc: `DEF +${Math.round((args[0] || 0.75) * 100)}% / 사이클 ATK ${Math.round((args[2] || 2.0) * 100)}% 회복 (${args[1] || 3}사이클)` }),
  341: (args) => ({ cls: 'buff', label: '피해 감소', desc: `모든 아군 피해 ${Math.round((args[0] || 0.45) * 100)}% 감소 (${args[1] || 1}사이클)` }),
  342: () => ({ cls: 'buff', label: '추가 턴', desc: '시전자 추가 턴 획득' }),
  343: () => ({ cls: 'healPercent', label: '완전 회복', desc: 'HP 완전 회복' }),
  344: () => ({ cls: 'buff', label: '복사', desc: '대상의 버프/디버프를 자신에게 복사' }),
  345: (args) => ({ cls: 'buff', label: '과부하 감소', desc: `개인 과부하 ${args[0] || 2} 감소` }),
  346: (args) => ({ cls: 'buff', label: '노트 회복', desc: `대상 턴 노트 ${args[0] || 1} 회복` }),
  347: (args) => ({ cls: 'buff', label: '스택 획득', desc: `${(args[0] || '').replace(/^_|Stacks$/g, '')} ${args[1] || 1}스택 획득` }),
  348: (args) => { const en = { fire: '염', water: '수', wind: '풍', light: '광', dark: '암' }; return { cls: 'buff', label: `${en[args[0]] || args[0]} 피해 증가`, desc: `${en[args[0]] || args[0]} 속성 피해 +${Math.round((args[1] || 0.5) * 100)}% (${args[2] || 3}사이클)` }; },
  349: (args) => ({ cls: 'buff', label: 'ATK+고조', desc: `아군 전체 ATK +${Math.round((args[0] || 0.35) * 100)}% / 고조 (${args[1] || 5}사이클)` }),
  350: (args) => ({ cls: 'buff', label: '마나 폭주', desc: `크리 시 HP ${Math.round((args[0] || 0.15) * 100)}% 회복, 피해 ${Math.round((args[2] || 0.5) * 100)}% 감소` }),
  351: (args) => ({ cls: 'debuff', label: '작별', desc: `작별 ${args[0] || 3}스택 (풍 크리 +25%/스택, 피격시 감소)` }),
  352: () => ({ cls: 'buff', label: '다음 무료', desc: '다음 스킬 코스트 0' }),
  353: () => ({ cls: 'buff', label: '전체 추가 턴', desc: '다른 아군 전체 추가 턴 획득' }),
  354: (args) => ({ cls: 'buff', label: '추가 턴+버프', desc: `추가 턴 + ${(args[0] || 'ATK').toUpperCase()} +${Math.round((args[1] || 0.3) * 100)}%` }),
};

function hasExtraEffects(extra, effectIds) {
  if (extra?.effects) return true;
  if (extra && Object.keys(extra).some(k => k in TOOLTIP_REGISTRY)) return true;
  if (effectIds?.some(e => (typeof e === 'object' ? e.id : e) in EFFECT_TOOLTIP_REGISTRY)) return true;
  return false;
}

function getExtraTooltips(extra, effectIds) {
  const entries = [];
  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      const factory = TOOLTIP_REGISTRY[key];
      if (factory) entries.push(factory(val, extra));
    }
  }
  if (effectIds) {
    for (const eid of effectIds) {
      const id = typeof eid === 'object' ? eid.id : eid;
      const args = typeof eid === 'object' ? (eid.args || []) : [];
      const factory = EFFECT_TOOLTIP_REGISTRY[id];
      if (factory) entries.push(factory(args));
    }
  }
  return entries;
}

// ═══════════════════════════════════════════════════
//  스킬 Extra 핸들러 레지스트리
//  useSkill에서 onSkillUsed 결과 수집 후 실행
//  새 extra 키 추가 시 여기만 등록하면 BattlePage 수정 불필요
// ═══════════════════════════════════════════════════

const SKILL_EXTRA_HANDLERS = {
  illusion_gain: (ctx) => {
    const cur = ctx.csUpdates._illusionStacks !== undefined
      ? ctx.csUpdates._illusionStacks
      : ((ctx.unit.combatStacks || {})._illusionStacks || 0);
    ctx.csUpdates._illusionStacks = cur + ctx.extra.illusion_gain;
    ctx.logs.push(`  [환영] ${ctx.unit.name} 환영 ${ctx.csUpdates._illusionStacks}스택`);
  },
  taunt_gain: (ctx) => {
    if (ctx.skill.type === 'buff') return;
    const cur = ctx.csUpdates._tauntStacks !== undefined
      ? ctx.csUpdates._tauntStacks
      : ((ctx.unit.combatStacks || {})._tauntStacks || 0);
    ctx.csUpdates._tauntStacks = cur + ctx.extra.taunt_gain;
    ctx.logs.push(`  [미스디렉션] ${ctx.unit.name} 도발 ${ctx.csUpdates._tauntStacks}스택`);
  },
  consume_illusion: (ctx) => {
    ctx.consumedIllusion = ctx.csUpdates._illusionStacks !== undefined
      ? ctx.csUpdates._illusionStacks
      : ((ctx.unit.combatStacks || {})._illusionStacks || 0);
    ctx.csUpdates._illusionStacks = 0;
    if (ctx.consumedIllusion > 0) {
      ctx.logs.push(`  [메타포모시스] 환영 ${ctx.consumedIllusion}스택 소모 → 위력 +${Math.round(ctx.consumedIllusion * (ctx.extra.power_per_stack || 0.25) * 100)}%`);
    }
  },
};

function applySkillExtras(extra, csUpdates, unit, skill, logs) {
  const ctx = { extra, csUpdates, unit, skill, logs, consumedIllusion: 0 };
  for (const key of Object.keys(extra)) {
    SKILL_EXTRA_HANDLERS[key]?.(ctx);
  }
  if (skill.type === 'attack' || skill.type === 'ultimate') {
    if ((unit.combatStacks || {})._prepared) {
      csUpdates._prepared = false;
      logs.push(`  [프리페어] 소모됨`);
    }
    const curOrigin = csUpdates._originStacks !== undefined
      ? csUpdates._originStacks
      : ((unit.combatStacks || {})._originStacks || 0);
    if (curOrigin > 0) {
      csUpdates._originStacks = curOrigin - 1;
      logs.push(`  [천의] 근원 1스택 소모 (잔여 ${curOrigin - 1})`);
    }
  }
  return ctx;
}

// ═══════════════════════════════════════════════════
//  스킬 사용 후 Extra 핸들러 (스택 적용 이후)
//  noteRestoreIfZero, encore_grant, hpCost 등 처리
// ═══════════════════════════════════════════════════

const POST_SKILL_HANDLERS = {
  noteRestoreIfZero: (ctx) => {
    const amt = ctx.extra.noteRestoreIfZero;
    ctx.setParty(prev => prev.map(u => {
      if (!u.alive || u.notes > 0) return u;
      ctx.addLog(`  ${u.name}: 턴 노트 ${amt} 회복`);
      return { ...u, notes: Math.min(u.maxNotes, u.notes + amt) };
    }));
  },
  // encore_grant → Effect 302 (onPostSkill)로 이관됨
  hpCost: (ctx) => {
    if (ctx.skill.type === 'buff') return;
    const hpLoss = Math.round(ctx.unit.maxHp * ctx.extra.hpCost);
    ctx.setParty(prev => prev.map(u => u.id !== ctx.unit.id ? u : {
      ...u, hp: Math.max(1, u.hp - hpLoss)
    }));
    ctx.addLog(`  ${ctx.unit.name}: HP ${hpLoss} 소모`);
    ctx.addFloatingDmg?.(ctx.unit.id, hpLoss, 'damage');
  },
};

function applyPostSkillExtras(extra, ctx) {
  const hCtx = { ...ctx, extra };
  for (const key of Object.keys(extra)) {
    POST_SKILL_HANDLERS[key]?.(hCtx);
  }
}

// ═══════════════════════════════════════════════════
//  버프 스킬 Extra 핸들러 (스탯 버프 적용 전)
//  hpCost, taunt_gain, cleanse_def_debuff, prepare 처리
// ═══════════════════════════════════════════════════

const BUFF_EXTRA_HANDLERS = {
  hpCost: (ctx) => {
    const hpLoss = Math.round(ctx.unit.maxHp * ctx.extra.hpCost);
    ctx.setParty(prev => prev.map(u => u.id !== ctx.unit.id ? u : {
      ...u, hp: Math.max(1, u.hp - hpLoss)
    }));
    ctx.addLog(`  ${ctx.unit.name}: HP ${hpLoss} 소모`);
    ctx.addFloatingDmg?.(ctx.unit.id, hpLoss, 'damage');
  },
  taunt_gain: (ctx) => {
    ctx.setParty(prev => prev.map(u => u.id !== ctx.unit.id ? u : {
      ...u, combatStacks: { ...(u.combatStacks || {}), _tauntStacks: ((u.combatStacks || {})._tauntStacks || 0) + ctx.extra.taunt_gain }
    }));
    ctx.addLog(`  ${ctx.unit.name}: 도발 ${ctx.extra.taunt_gain}스택 획득`);
  },
  cleanse_def_debuff: (ctx) => {
    ctx.setParty(prev => prev.map(u => {
      if (u.id !== ctx.unit.id) return u;
      const removeIdx = u.debuffs.findIndex(d => d.stat === 'def');
      if (removeIdx < 0) return u;
      const remaining = [...u.debuffs];
      remaining.splice(removeIdx, 1);
      ctx.addLog(`  ${u.name}: 방어력 감소 디버프 해제`);
      return { ...u, debuffs: remaining };
    }));
  },
  prepare: (ctx) => {
    ctx.setParty(prev => prev.map(u => u.id !== ctx.unit.id ? u : {
      ...u, combatStacks: { ...(u.combatStacks || {}), _prepared: true }
    }));
    ctx.addLog(`${ctx.unit.name} → ${ctx.skill.name}: 다음 공격 데미지 ${ctx.extra.prepare.damageMult}배, 코스트 ${ctx.extra.prepare.costMult}배`);
  },
};

function processBuffExtras(extra, ctx) {
  const hCtx = { ...ctx, extra };
  for (const key of Object.keys(extra)) {
    BUFF_EXTRA_HANDLERS[key]?.(hCtx);
  }
}

// ═══════════════════════════════════════════════════
//  상태 부여 버프 레지스트리
//  새 상태 버프 키 추가 시 여기만 등록
// ═══════════════════════════════════════════════════

const STATUS_BUFF_REGISTRY = {
  party_ignore_def: '방어 관통',
  cycle_taunt_grant: '도발 부여',
  light_damage_boost: '광 피해 증가',
};

function findStatusBuffKey(extra) {
  return Object.keys(STATUS_BUFF_REGISTRY).find(k => extra[k]);
}

function getStatusBuffName(key) {
  return STATUS_BUFF_REGISTRY[key] || key;
}

// ═══════════════════════════════════════════════════
//  공격 후 Extra 핸들러
//  buff, alsoHeal, selfHeal, shield, storm_stacks 처리
// ═══════════════════════════════════════════════════

function processPostAttackExtras(extra, ctx) {
  if (extra.buff && !extra.effects) {
    ctx.setParty(prev => prev.map(u => {
      if (!u.alive) return u;
      const res = attachBuff(u.id, { stat: extra.buff.stat, amount: extra.buff.amount, turns: extra.buff.turns, skillId: ctx.skill.id, skillName: ctx.skill.name, casterId: ctx.unit?.id });
      return { ...u, buffs: res.buffs };
    }));
    ctx.addLog(`  아군 전체 ${extra.buff.stat.toUpperCase()} ${Math.round(extra.buff.amount * 100)}% 증가!`);
  }
  if (extra.alsoHeal && !extra.effects) {
    ctx.setParty(prev => prev.map(u => u.alive ? {
      ...u, hp: Math.min(u.maxHp, u.hp + Math.round(u.maxHp * extra.alsoHeal))
    } : u));
    ctx.addLog(`  아군 전체 HP ${Math.round(extra.alsoHeal * 100)}% 회복!`);
  }
  // selfHeal → Effect 301 (onPostAttack)로 이관됨
  if (extra.shield) {
    const shieldAmt = Math.round(getEffStat(ctx.unit, 'atk') * extra.shield.atkRatio);
    const shieldTargets = extra.shield.scope === 'party' ? ctx.party.filter(u => u.alive) : ctx.targets;
    for (const t of shieldTargets) {
      const tSetter = ctx.party.some(u => u.id === t.id) ? ctx.setParty : ctx.setEnemies;
      tSetter(prev => prev.map(u => u.id !== t.id ? u : {
        ...u, shield: (u.shield || 0) + shieldAmt
      }));
      ctx.addLog(`  ${t.name}: 보호막 ${shieldAmt} 부여`);
      ctx.addFloatingDmg?.(t.id, shieldAmt, 'shield');
    }
  }
  const skillElem = ctx.skill.element || ctx.unit.element;
  const stormEff = (ctx.skill.effectIds || []).find(e => (typeof e === 'object' ? e.id : e) === 320);
  const stormAmount = extra.storm_stacks || (stormEff ? (typeof stormEff === 'object' ? stormEff.args?.[0] : 0) || 2 : 0);
  if (stormAmount || skillElem === 'wind') {
    ctx.setEnemies(prev => prev.map(u => {
      if (!ctx.targets.some(t => t.id === u.id)) return u;
      let stacks = (u.combatStacks || {})._stormStacks || 0;
      let statuses = u.statuses || [];
      if (stormAmount) {
        stacks += stormAmount;
        if (!statuses.some(s => s.key === 'storm')) {
          statuses = [...statuses, { key: 'storm', turns: 999, statusKey: 'storm' }];
        }
        ctx.addLog(`  ${u.name}: 폭풍 ${stormAmount}스택 부여 (${stacks})`);
      }
      if (skillElem === 'wind' && stacks > 0) {
        stacks--;
        if (stacks <= 0) statuses = statuses.filter(s => s.key !== 'storm');
        ctx.addLog(`  ${u.name}: 폭풍 1스택 소모 (${stacks})`);
      }
      return { ...u, combatStacks: { ...(u.combatStacks || {}), _stormStacks: stacks }, statuses };
    }));
  }
}

// ═══════════════════════════════════════════════════
//  통합 결과 처리 함수
//  모디파이어(runEvent)가 반환하는 모든 결과 키를 일괄 처리
//
//  ctx 필수: { unitId, setParty, setEnemies, addLog }
//  ctx 선택: { addFloatingDmg, trackDmg, party, enemies,
//             applyDmgToUnit, calcDmg, triggerIllusionOnHeal,
//             attackerId, defenderId, unitName }
//  options: { accumulateStacks: false } — true면 combatStackUpdates를 적용하지 않고 반환만
// ═══════════════════════════════════════════════════

function processResults(results, ctx, { accumulateStacks = false } = {}) {
  const acc = {
    combatStackUpdates: {},
    noteRecover: 0,
    noteRecoverUncapped: 0,
    cdReduce: 0,
    trackerUpdates: {},
    bonusHeal: 0,
    extraTurnUnits: [],
    illusionPowerBonus: 0,
    logs: [],
  };

  const isEnemy = (ctx.enemies || []).some(u => u.id === ctx.unitId);
  const unitSetter = isEnemy ? ctx.setEnemies : ctx.setParty;

  for (const r of results) {
    // === 누적 값 (호출자가 적용 시점 결정) ===
    if (r.combatStackUpdates) {
      Object.assign(acc.combatStackUpdates, r.combatStackUpdates);
      if (!accumulateStacks) {
        const targetId = r._ownerId || ctx.unitId;
        const isTargetEnemy = (ctx.enemies || []).some(u => u.id === targetId);
        const setter = isTargetEnemy ? ctx.setEnemies : ctx.setParty;
        setter(prev => prev.map(u => u.id !== targetId ? u : {
          ...u, combatStacks: { ...(u.combatStacks || {}), ...r.combatStackUpdates }
        }));
      }
    }
    if (r.noteRecover) acc.noteRecover += r.noteRecover;
    if (r.noteRecoverUncapped) acc.noteRecoverUncapped += r.noteRecoverUncapped;
    if (r.cdReduce) acc.cdReduce += r.cdReduce;
    if (r.trackerResets) Object.assign(acc.trackerUpdates, r.trackerResets);
    if (r.trackerUpdates) Object.assign(acc.trackerUpdates, r.trackerUpdates);
    if (r.bonusHeal) acc.bonusHeal += r.bonusHeal;
    if (r.extraTurn) acc.extraTurnUnits.push(ctx.unitId);
    if (r.illusionPowerBonus) acc.illusionPowerBonus += r.illusionPowerBonus;
    if (r.log) acc.logs.push(r.log);
    if (r.logs) acc.logs.push(...r.logs);

    // === 즉시 적용되는 부작용 ===

    if (r.partyHeal && ctx.setParty) {
      for (const h of r.partyHeal) ctx.addFloatingDmg?.(h.unitId, h.amount, 'heal');
      ctx.setParty(prev => prev.map(u => {
        const heal = r.partyHeal.find(h => h.unitId === u.id);
        return heal ? { ...u, hp: Math.min(u.maxHp, u.hp + heal.amount) } : u;
      }));
      ctx.triggerIllusionOnHeal?.();
    }

    if (r.partyNoteRestore && ctx.setParty) {
      ctx.setParty(prev => prev.map(u => {
        const nr = r.partyNoteRestore.find(h => h.unitId === u.id);
        return nr ? { ...u, notes: Math.min(u.maxNotes, u.notes + nr.amount) } : u;
      }));
    }

    if (r.enemyNoteReduce && ctx.setEnemies) {
      for (const enr of r.enemyNoteReduce) {
        ctx.setEnemies(prev => prev.map(u => u.id !== enr.targetId ? u : {
          ...u, notes: Math.max(0, u.notes - enr.amount)
        }));
      }
    }

    if (r.selfHeal && ctx.setParty) {
      ctx.addFloatingDmg?.(ctx.unitId, r.selfHeal, 'heal');
      ctx.setParty(prev => prev.map(u => u.id !== ctx.unitId ? u : {
        ...u, hp: Math.min(u.maxHp, u.hp + r.selfHeal)
      }));
    }

    if (r.selfDamage && ctx.setParty) {
      const ownerId = r._ownerId || ctx.unitId;
      ctx.addFloatingDmg?.(ownerId, r.selfDamage, 'damage');
      ctx.setParty(prev => prev.map(u => u.id !== ownerId ? u : {
        ...u, hp: Math.max(1, u.hp - r.selfDamage)
      }));
    }

    if (r.consumeAllShields && ctx.setParty) {
      ctx.setParty(prev => prev.map(u => ({ ...u, shield: 0 })));
    }

    if (r.partyMaxNoteBoost && ctx.setParty) {
      ctx.setParty(prev => prev.map(pu => pu.alive ? {
        ...pu, maxNotes: pu.maxNotes + r.partyMaxNoteBoost,
        notes: pu.maxNotes + r.partyMaxNoteBoost
      } : pu));
    }

    if (r.debuffTransfers && ctx.setParty) {
      for (const dt of r.debuffTransfers) {
        const fromDebuffs = cleanse(dt.fromId, 1);
        const toRes = attachDebuff(ctx.unitId, dt.debuff);
        ctx.setParty(prev => prev.map(u => {
          if (u.id === dt.fromId) return { ...u, debuffs: fromDebuffs };
          if (u.id === ctx.unitId) return { ...u, debuffs: toRes.debuffs };
          return u;
        }));
      }
    }

    if (r.enemyDamage && ctx.setEnemies && ctx.applyDmgToUnit) {
      const ed = r.enemyDamage;
      ctx.addFloatingDmg?.(ed.targetId, ed.damage, 'damage');
      ctx.trackDmg?.(ctx.unitId, ctx.unitName, ed.targetName, ed.damage, ed.source || '패시브');
      ctx.setEnemies(prev => prev.map(eu => {
        if (eu.id !== ed.targetId) return eu;
        const dr = ctx.applyDmgToUnit(eu, ed.damage);
        dr._dmgLogs.forEach(l => ctx.addLog(l));
        return { ...eu, ...dr };
      }));
    }

    if (r.meteorAttack && ctx.setEnemies && ctx.calcDmg) {
      const ma = r.meteorAttack;
      const unit = (ctx.party || []).find(u => u.id === ctx.unitId);
      const aliveTargets = (ctx.enemies || []).filter(e => e.alive && ma.targets.includes(e.id));
      for (const target of aliveTargets) {
        const { damage, isCrit } = ctx.calcDmg(unit, target, ma.skill.power, ma.skill.element, ma.skill.extra?.ignoreDef);
        const finalDmg = ma.isAoe ? Math.round(damage * gameConfig.battle.undefendedPenalty) : damage;
        ctx.addFloatingDmg?.(target.id, finalDmg, isCrit ? 'crit' : 'damage');
        ctx.trackDmg?.(ctx.unitId, ctx.unitName, target.name, finalDmg, '유성우');
        ctx.setEnemies(prev => prev.map(eu => {
          if (eu.id !== target.id) return eu;
          const dr = ctx.applyDmgToUnit(eu, finalDmg);
          dr._dmgLogs.forEach(l => ctx.addLog(l));
          return { ...eu, ...dr };
        }));
      }
    }

    if (r.bonusDamage && ctx.setEnemies) {
      for (const bd of r.bonusDamage) {
        const bdTarget = (ctx.enemies || []).find(e => e.id === bd.targetId);
        ctx.addFloatingDmg?.(bd.targetId, bd.damage, 'damage');
        ctx.trackDmg?.(ctx.unitId, ctx.unitName, bdTarget?.name || '?', bd.damage, '패시브');
        ctx.setEnemies(prev => prev.map(u => {
          if (u.id !== bd.targetId) return u;
          const cs = { ...(u.combatStacks || {}), ...(bd.stackConsume || {}) };
          const newHp = Math.max(0, u.hp - bd.damage);
          return { ...u, hp: newHp, alive: newHp > 0, combatStacks: cs };
        }));
      }
    }

    if (r.applyDebuff && ctx.setEnemies) {
      for (const ad of r.applyDebuff) {
        const res = attachDebuff(ad.targetId, ad.debuff);
        ctx.setEnemies(prev => prev.map(u => u.id !== ad.targetId ? u : {
          ...u, debuffs: res.debuffs
        }));
      }
    }

    if (r.targetStackUpdates && ctx.setEnemies) {
      for (const tu of r.targetStackUpdates) {
        ctx.setEnemies(prev => prev.map(u => {
          if (u.id !== tu.targetId) return u;
          const cs = { ...(u.combatStacks || {}), ...tu.stacks };
          let statuses = u.statuses || [];
          if (tu.addStatus && !statuses.some(s => s.key === tu.addStatus.key)) {
            statuses = [...statuses, tu.addStatus];
          }
          return { ...u, combatStacks: cs, statuses };
        }));
      }
    }

    if (r.attackerStackUpdates) {
      const attackerId = ctx.attackerId || ctx.unitId;
      const isEnemyAttacker = (ctx.enemies || []).some(u => u.id === attackerId);
      const aSetter = isEnemyAttacker ? ctx.setEnemies : ctx.setParty;
      aSetter(prev => prev.map(u => u.id !== attackerId ? u : {
        ...u, combatStacks: { ...(u.combatStacks || {}), ...r.attackerStackUpdates }
      }));
    }

    if (r.defenderStackUpdates && ctx.setParty) {
      const defenderId = ctx.defenderId || ctx.unitId;
      ctx.setParty(prev => prev.map(u => u.id !== defenderId ? u : {
        ...u, combatStacks: { ...(u.combatStacks || {}), ...r.defenderStackUpdates }
      }));
    }

    if (r.partyStackUpdates && ctx.setParty) {
      for (const pu of r.partyStackUpdates) {
        ctx.setParty(prev => prev.map(u => u.id !== pu.targetId ? u : {
          ...u, combatStacks: { ...(u.combatStacks || {}), ...pu.stacks }
        }));
      }
    }

    if (r.maxHpReduce != null) {
      const targetId = r._ownerId || ctx.unitId;
      const mhSetter = isEnemy ? ctx.setEnemies : ctx.setParty;
      if (mhSetter) {
        mhSetter(prev => prev.map(u => {
          if (u.id !== targetId) return u;
          const newMax = Math.round(u.maxHp * (1 - r.maxHpReduce));
          return { ...u, maxHp: newMax, hp: Math.min(u.hp, newMax) };
        }));
      }
    }

    if (r.maxNoteReduce && ctx.setParty) {
      ctx.setParty(prev => prev.map(u => u.id !== (r._ownerId || ctx.unitId) ? u : {
        ...u,
        maxNotes: Math.max(1, u.maxNotes - r.maxNoteReduce),
        notes: Math.min(u.notes, Math.max(1, u.maxNotes - r.maxNoteReduce))
      }));
    }

    if (r.ownerNoteSpend && ctx.setParty) {
      ctx.setParty(prev => prev.map(u => u.id !== (r._ownerId || ctx.unitId) ? u : {
        ...u, notes: Math.max(0, u.notes - r.ownerNoteSpend)
      }));
    }

    if (r.partyBuffGrant && ctx.setParty) {
      for (const bg of r.partyBuffGrant) {
        const res = attachBuff(bg.targetId, bg.buff);
        ctx.setParty(prev => prev.map(u => u.id !== bg.targetId ? u : {
          ...u, buffs: res.buffs
        }));
      }
    }

    if (r.enemyDebuffGrant && ctx.setEnemies) {
      for (const dg of r.enemyDebuffGrant) {
        const res = attachDebuff(dg.targetId, dg.debuff);
        ctx.setEnemies(prev => prev.map(u => u.id !== dg.targetId ? u : {
          ...u, debuffs: res.debuffs
        }));
      }
    }

    if (r.grantShield && ctx.setParty) {
      const targetId = r._ownerId || ctx.unitId;
      ctx.setParty(prev => prev.map(u => u.id !== targetId ? u : {
        ...u, shield: (u.shield || 0) + r.grantShield
      }));
    }

    if (r.partyShieldGrant && ctx.setParty) {
      for (const sg of r.partyShieldGrant) {
        ctx.addFloatingDmg?.(sg.unitId, sg.amount, 'shield');
        ctx.setParty(prev => prev.map(u => u.id !== sg.unitId ? u : {
          ...u, shield: (u.shield || 0) + sg.amount
        }));
      }
    }

    if (r.selfCleanse && ctx.setParty) {
      const ownerId = r._ownerId || ctx.unitId;
      const remaining = cleanse(ownerId, r.selfCleanse);
      ctx.setParty(prev => prev.map(u => u.id !== ownerId ? u : {
        ...u, debuffs: remaining
      }));
    }

    if (r.grantExtraTurn && ctx.setParty) {
      acc.grantExtraTurns = acc.grantExtraTurns || [];
      acc.grantExtraTurns.push(r.grantExtraTurn);
    }
    if (r.grantExtraTurns && ctx.setParty) {
      acc.grantExtraTurns = acc.grantExtraTurns || [];
      acc.grantExtraTurns.push(...r.grantExtraTurns);
    }

    if (r.applyMarks && ctx.setEnemies) {
      for (const am of r.applyMarks) {
        ctx.setEnemies(prev => prev.map(u => u.id !== am.targetId ? u : {
          ...u, marks: [...(u.marks || []), am.mark]
        }));
      }
    }

    if (r.allCdReduce && ctx.setParty) {
      const targetId = r._ownerId || ctx.unitId;
      ctx.setParty(prev => prev.map(u => {
        if (u.id !== targetId || !u.skillCooldowns) return u;
        return { ...u, skillCooldowns: u.skillCooldowns.map(cd => Math.max(0, cd - r.allCdReduce)) };
      }));
    }

    if (r.applyStatuses) {
      for (const as of r.applyStatuses) {
        const isTargetEnemy = (ctx.enemies || []).some(u => u.id === as.targetId);
        const stSetter = isTargetEnemy ? ctx.setEnemies : ctx.setParty;
        if (stSetter) {
          stSetter(prev => prev.map(u => {
            if (u.id !== as.targetId) return u;
            const statuses = (u.statuses || []).filter(s => s.key !== as.statusKey);
            const { targetId: _tid, ...statusData } = as;
            return { ...u, statuses: [...statuses, { ...statusData, key: as.statusKey }] };
          }));
        }
      }
    }
  }

  // Effect에서 addBuff/addDebuff 직접 호출한 경우 UI 자동 반영
  if (ctx.setParty) ctx.setParty(prev => prev.map(u => ({ ...u, buffs: getBuffs(u.id), debuffs: getDebuffs(u.id) })));
  if (ctx.setEnemies) ctx.setEnemies(prev => prev.map(u => ({ ...u, buffs: getBuffs(u.id), debuffs: getDebuffs(u.id) })));

  return acc;
}

export {
  STACK_REGISTRY, getActiveStacks,
  TOOLTIP_REGISTRY, hasExtraEffects, getExtraTooltips,
  processResults,
  applySkillExtras, applyPostSkillExtras,
  processBuffExtras, findStatusBuffKey, getStatusBuffName,
  processPostAttackExtras,
};
