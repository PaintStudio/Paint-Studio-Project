// 글로벌 튜토리얼 가이드 설정
// tutorialStep 값에 따라 각 페이지에서 표시할 가이드 정의
//
// step: tutorialStep 값
// page: 이 가이드가 표시될 페이지 (탭 key)
// steps: 순차 진행되는 가이드 스텝 배열
//   - text: 표시 텍스트
//   - speaker / speakerImage: 화자 (선택)
//   - waitFor: 'click' (기본, 클릭으로 넘김) | 'tab_click' | 'gacha_pull' | 'action' 등
//   - targetTab: waitFor === 'tab_click' 시 이동할 탭 key
//   - highlight: 하이라이트할 CSS 선택자 (선택)
//   - position: 가이드 박스 위치 'bottom'(기본) | 'center' | 'top'
//   - onComplete: 'advance_step' (이 스텝 완료 시 tutorialStep 증가)

const tutorialGuide = [
  {
    step: 1,
    page: 'lobby',
    steps: [
      {
        speaker: '프림',
        text: '여기가 로비예요! 여기서 여러 메뉴로 이동할 수 있어요.',
      },
      {
        speaker: '프림',
        text: '우선 캐릭터를 뽑아볼까요? 아래의 뽑기 탭을 눌러보세요!',
        waitFor: 'tab_click',
        targetTab: 'gacha',
        highlight: '[data-tab="gacha"]',
      },
    ],
  },
  {
    step: 2,
    page: 'gacha',
    steps: [
      {
        speaker: '프림',
        text: '여기가 뽑기 화면이에요! 여기서 새로운 캐릭터를 만날 수 있답니다.',
      },
      {
        speaker: '프림',
        text: '한번 뽑아볼까요? 1회 뽑기 버튼을 눌러보세요!',
        waitFor: 'gacha_pull',
        highlight: '.btn-pull-single',
      },
    ],
  },
  {
    step: 3,
    page: 'gacha',
    steps: [
      {
        speaker: '프림',
        text: '축하해요! 첫 번째 캐릭터를 뽑았네요!',
      },
      {
        speaker: '프림',
        text: '이제 자유롭게 탐험해보세요. 궁금한 건 언제든 물어봐도 좋아요!',
        onComplete: 'finish',
      },
    ],
  },
];

export default tutorialGuide;
