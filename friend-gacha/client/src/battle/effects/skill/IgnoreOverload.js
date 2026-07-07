import { Effect, registerEffect } from '../../effectSystem';

// 이 스킬이 과부하의 영향을 받지 않음을 표시하는 마커 이펙트
class IgnoreOverload extends Effect {
  static ID = 319;
}

registerEffect(IgnoreOverload);
