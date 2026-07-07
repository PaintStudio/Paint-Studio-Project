import { Effect, registerEffect, mapType } from '../../effectSystem';

// BattlePage.jsx의 힐 섹션에서 직접 처리 — 대상별 HP 체크 필요
class LowHpHealBoost extends Effect {
  static ID = 156;
}

registerEffect(LowHpHealBoost);
mapType('low_hp_heal_boost', 156);
