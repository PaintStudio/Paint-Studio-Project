import React from 'react';
import { createPortal } from 'react-dom';
import gameConfig from '@gameConfig';
import { ELEM_ICONS } from '../utils/gameConstants';
import './InfoModals.css';

const ELEM = gameConfig.elements;

const ORIGIN_DESCS = {
  time:      '흘러가는 시간. 멈출 수 없고 모두에게 평등하다.\n속도와 행동 순서, 치명타 확률을 조작하는 서포터.',
  space:     '발을 딛고 서 있는 공간. 존재가 서 있는 곳을 정의한다.\n보호막을 부여하고 아군에 향하는 공격을 끌어오는 수호자.',
  life:      '삶을 가진 존재. 맥동하는 신비.\nHP를 상승시키고 아군에 향하는 공격을 받아내는 수호자.',
  heart:     '감정과 의지의 근본. 존재 간의 상호작용.\n아군을 지원하고 강화하는 서포터.',
  intellect: '지식과 논리로 세계를 해석하는 힘.\n자신만의 개성을 다루는 스페셜리스트.',
  memory:    '기억을 읽고 재구성하는 힘.\n적에게 약화와 상태이상을 부여하는 디버퍼.',
  sound:     '소리와 파동을 매개로 하는 힘.\n턴 노트를 조작하고 아군의 턴을 부여하는 서포터.',
  season:    '자연의 순환. 당연한 것이 당연케 하는 흐름.\n아군의 HP를 회복하는 치유가.',
  force:     '순수한 힘의 원천. 에너지의 상징.\n강력한 피해로 적을 제압하는 공격수.',
};

export function ElementModal({ onClose }) {
  return createPortal(
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal" onClick={e => e.stopPropagation()}>
        <div className="info-modal-header">
          <h3>속성 상성</h3>
          <button className="info-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="elem-sections">
          {/* 염수풍 삼각형 */}
          <div className="elem-section">
            <div className="elem-triangle">
              <div className="elem-tri-node elem-tri-top">
                <span className="elem-circle" style={{ background: ELEM.fire.color }}
                  dangerouslySetInnerHTML={{ __html: ELEM_ICONS.fire }} />
                <span className="elem-node-label" style={{ color: ELEM.fire.color }}>{ELEM.fire.label}</span>
              </div>
              <div className="elem-tri-arrow arrow-right">&#8594;</div>
              <div className="elem-tri-arrow arrow-left">&#8592;</div>
              <div className="elem-tri-node elem-tri-bl">
                <span className="elem-circle" style={{ background: ELEM.wind.color }}
                  dangerouslySetInnerHTML={{ __html: ELEM_ICONS.wind }} />
                <span className="elem-node-label" style={{ color: ELEM.wind.color }}>{ELEM.wind.label}</span>
              </div>
              <div className="elem-tri-arrow arrow-bottom">&#8594;</div>
              <div className="elem-tri-node elem-tri-br">
                <span className="elem-circle" style={{ background: ELEM.water.color }}
                  dangerouslySetInnerHTML={{ __html: ELEM_ICONS.water }} />
                <span className="elem-node-label" style={{ color: ELEM.water.color }}>{ELEM.water.label}</span>
              </div>
            </div>
            <div className="elem-desc-list">
              <p><span style={{ color: ELEM.fire.color }}>{ELEM.fire.label}</span> &#8594; <span style={{ color: ELEM.wind.color }}>{ELEM.wind.label}</span>에 강함</p>
              <p><span style={{ color: ELEM.wind.color }}>{ELEM.wind.label}</span> &#8594; <span style={{ color: ELEM.water.color }}>{ELEM.water.label}</span>에 강함</p>
              <p><span style={{ color: ELEM.water.color }}>{ELEM.water.label}</span> &#8594; <span style={{ color: ELEM.fire.color }}>{ELEM.fire.label}</span>에 강함</p>
            </div>
          </div>

          <div className="elem-divider" />

          {/* 광암 상호 */}
          <div className="elem-section">
            <div className="elem-dual">
              <div className="elem-dual-node">
                <span className="elem-circle" style={{ background: ELEM.light.color }}
                  dangerouslySetInnerHTML={{ __html: ELEM_ICONS.light }} />
                <span className="elem-node-label" style={{ color: ELEM.light.color }}>{ELEM.light.label}</span>
              </div>
              <div className="elem-dual-arrows">
                <span className="dual-arrow-down">&#8595;</span>
                <span className="dual-arrow-up">&#8593;</span>
              </div>
              <div className="elem-dual-node">
                <span className="elem-circle" style={{ background: ELEM.dark.color }}
                  dangerouslySetInnerHTML={{ __html: ELEM_ICONS.dark }} />
                <span className="elem-node-label" style={{ color: ELEM.dark.color }}>{ELEM.dark.label}</span>
              </div>
            </div>
            <div className="elem-desc-list">
              <p><span style={{ color: ELEM.light.color }}>{ELEM.light.label}</span> &#8596; <span style={{ color: ELEM.dark.color }}>{ELEM.dark.label}</span> 상호 강함</p>
            </div>
          </div>
        </div>

        <div className="elem-mult-info">
          유리 속성 공격 시 <strong>{gameConfig.elementMultipliers.normal}x</strong> 데미지 / 불리 속성 공격 시 <strong>{gameConfig.elementMultipliers.normalResist}x</strong> 데미지
        </div>
      </div>
    </div>,
    document.getElementById('game-root')
  );
}

export function OriginModal({ onClose }) {
  const origins = Object.entries(gameConfig.origins);
  const col1 = origins.slice(0, 5);
  const col2 = origins.slice(5);
  return createPortal(
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal info-modal-origins" onClick={e => e.stopPropagation()}>
        <div className="info-modal-header">
          <h3>근원</h3>
          <button className="info-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="origin-grid-wrap">
          <div className="origin-col">
            {col1.map(([key, cfg]) => (
              <div key={key} className="origin-cell">
                <span className="origin-icon-wrap">
                  <span className="origin-modal-icon" style={{
                    backgroundColor: cfg.color,
                    WebkitMaskImage: `url(/uploads/origins/${key}.png)`,
                    maskImage: `url(/uploads/origins/${key}.png)`,
                  }} />
                </span>
                <div className="origin-text">
                  <span className="origin-name" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="origin-desc">{ORIGIN_DESCS[key] || ''}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="origin-col">
            {col2.map(([key, cfg]) => (
              <div key={key} className="origin-cell">
                <span className="origin-icon-wrap">
                  <span className="origin-modal-icon" style={{
                    backgroundColor: cfg.color,
                    WebkitMaskImage: `url(/uploads/origins/${key}.png)`,
                    maskImage: `url(/uploads/origins/${key}.png)`,
                  }} />
                </span>
                <div className="origin-text">
                  <span className="origin-name" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="origin-desc">{ORIGIN_DESCS[key] || ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('game-root')
  );
}
