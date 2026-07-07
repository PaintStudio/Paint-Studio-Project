// 튜토리얼 스크립트
// 각 항목 구조:
//   speaker   - 화자 이름 (생략하면 나레이션)
//   text      - 대사 텍스트 (\n으로 줄바꿈)
//   characters - 캐릭터 이미지 배열 (선택)
//     [{ name, image, position: 'left'|'right', active: true|false }]
//   bg        - 배경 이미지 URL (선택, 한번 설정하면 다음 bg가 나올때까지 유지됨)
//   choices   - 선택지 배열 (선택)
//     [{ text: '선택지 텍스트', next: 인덱스 또는 'label문자열' }]
//   label     - 점프 대상 라벨 (choices의 next에서 참조)

const tutorialScript = [
	{
		text: '튜토리얼을 스킵합니까?',
		choices: [
		{text:'스킵한다', next: 'tutorial_end'},
		{text:'스킵하지 않는다', next: 'tutorial_start'}
	  ],		
	},
	{
		label: 'tutorial_start',
		text: '...',
		
	},
	{
		text: '주변이 어둡다.',
		
	},	
	{
		text: '정전인가? 그렇다고 해도 너무 어두워졌는데.',
		
	},	
	{
		text: '애초에 내 방 같은 느낌이 아니다. 바람이 이렇게 불 리가 없으니까.',
		
	},
	{
		text: '나는 그제서야 내가 눈을 감고 있었다는 사실을 깨달았다.',
		
	},
	{
		text: '그리고 눈을 뜨니 보이는 것은──',
		
	},
	{
		text: '이름 모를 숲이었다.',
		bg: '/uploads/bg/forest.png',
	},
	{
		text: '뭐야, 갑자기?',
	},
	{
		text: '당황한 채 주변을 둘러보는 것도 잠시, 어깨를 잡는 손에 깜짝 놀라 시선이 돌아갔다.',
	},	
	{
		speaker: '???',
		text: '앗. 제대로 요청이 보내진 모양이네요!',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},	
	{
		text: '한 소녀가 내 눈 앞에서 미소짓고 있었다. 누구지, 이 사람은? ',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center', active: false },
		],
	},
	{
		speaker: '???',
		text: '역시 조금 당황하셨겠죠? 조금이 아닐지도 몰라요. 그렇지만 약간 급한 상황이라서 어쩔 수 없던 점을 양해해주셨으면 좋겠네요. 아, 일단 걸을까요?',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},
	{
		text: '...뭔가 대답하기도 전에 손목을 붙잡혀 끌려가기 시작했다.',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center', active: false },
		],
	},	
	{
		speaker: '???',
		text: '일단은 조금씩 설명해드릴게요. 맞다, 저는 프림이라고 해요. 이 세상의... 음, 직원? 이라고 하면 좋을까요?',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},
	{
		speaker: '프림',
		text: '자세히 설명하면 복잡해지니까 간단하게 설명하면, 이 세상의 테스트 겸 디버그 겸 문제 해결을 해 주실 분이 필요했어요. 아, 그게 디버그네요...',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},
	{
		speaker: '프림',
		text: '저희가 나름대로 잘 만든다고 만들었는데, 어디서 꼬였는지 이상 현상들이 발생하고 있거든요. 분명 백엔드 쪽 문제일텐데, 만들던 아이가 도망쳐 버려서.',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},	
	{
		speaker: '프림',
		text: '아무튼, 그 이상 현상이 어떤 거냐면──',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},	
	{
		text: '프림이 말을 끝맽기도 전에, 쿵! 하는 커다란 소리와 함께 눈 앞에 무엇인가가 떨어졌다.',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center', active: false },
		],
	},
	{
		speaker: '???',
		text: '크르르──',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'right', active: false },
			{name: '거대 몬스터', image: '/uploads/standings/tutorial_monster.png', position: 'center' },
		],
	},	
	{
		speaker: '프림',
		text: '네!! 저거, 저거 같은 거 말이에요!',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'right'},
			{name: '거대 몬스터', image: '/uploads/standings/tutorial_monster.png', position: 'center', active: false },
		],
	},	
	{
		speaker: '프림',
		text: '갑작스럽지만 좀 도와 주실래요? 결국 저는 직원이라서 혼자서는 뭘 못 하고... 명령이 있어야 되거든요!',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'right'},
			{name: '거대 몬스터', image: '/uploads/standings/tutorial_monster.png', position: 'center', active: false },
		],
	},
	{
		speaker: '프림',
		text: '그 명령권자로 요청한 게 당신이니까, 분명히 좋은 지휘 능력을 가지고 계실 거예요! 자, 그럼!',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'right'},
			{name: '거대 몬스터', image: '/uploads/standings/tutorial_monster.png', position: 'center', active: false },
		],
	},
	{
		type: 'battle',
		stageName: '튜토리얼 전투',
		chapter: 1,
		party: [
			{
				charId: 22, level: 1, promotion: 0, awakening: 0
				
			},
		],
		enemies: [
			{monsterId: 'wolf'},
			{monsterId: 'wolf'},
			{monsterId: 'wolf'},
		],
		guide: [
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '드디어 전투 시작이네요! 아직 잘 모르실테니, 기본적인 설명을 드릴게요.'
			},
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '모든 캐릭터는 스킬을 가지고 있어요. 스킬은 턴 노트라는 자원을 소모하고요.'				
			},
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '제 최대 턴 노트는 5고, 기본 공격의 코스트는 1이네요. 자, 기본 공격으로 적을 공격해보죠!',
				waitFor: 'skill_use',
				allowSkills: [0]
			},	
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '좋아요! 멋지게 적을 공격했어요. 턴 노트가 1 소모된게 보이시나요?',
			},	
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '턴 노트가 남아 있는 한, 제 턴은 끝나지 않아요. 몇 번이고 스킬을 사용할 수 있답니다.',
			},	
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '자, 한 번 더 적을 기본 공격으로 공격해보죠!',
				waitFor: 'skill_use',
				allowSkills: [0]
			},	
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '좋아요! 이번엔 턴 노트가 2 소모된게 보이시나요?',
			},	
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '자기 턴에 스킬을 사용할 때마다 턴 노트 과부하가 1 증가해요. 모든 스킬의 코스트가 과부하 수치만큼 증가하니까, 스킬을 마구 난사할 수는 없겠네요. 턴을 종료하죠!',
				waitFor: 'turn_end',
			},
			{
				trigger: 'enemy_turn',
				speaker: '프림',
				text: '턴 노트를 2 남기고 턴을 종료했어요. 이제 적의 턴이네요.',
			},	
			{
				trigger: 'enemy_turn',
				speaker: '프림',
				text: '캐릭터는 공격 스킬 말고도, 방어 스킬을 가지고 있어요. 이 방어 스킬을 사용하면 적의 공격을 막아서, 피해를 감소시킬 수 있죠!',
			},	
			{
				trigger: 'enemy_turn',
				speaker: '프림',
				text: '물론 방어 스킬도 턴 노트를 소모하니, 자기 턴에 턴 노트가 고갈되면 공격을 막을 수 없어요. 주의해주세요!',
			},	
			{
				trigger: 'defense_react',
				speaker: '프림',
				text: '자, 이제 적의 공격을 기본 방어로 막아 볼까요?',
				waitFor: 'defense_use',
				allowSkills: [0]
			},		
			{
				trigger: 'enemy_turn',
				speaker: '프림',
				text: '좋아요! 방어 스킬은 턴 노트 과부하의 영향을 받지 않아요. 한 번 더 방어할 수 있겠네요.',
			},
			{
				trigger: 'defense_react',
				speaker: '프림',
				text: '다음 공격도 방어해보죠!',
				waitFor: 'defense_use',
				allowSkills: [0]
			},	
			{
				trigger: 'enemy_turn',
				speaker: '프림',
				text: '잘 막아냈지만, 턴 노트가 고갈되어 버렸네요.',
			},	
			{
				trigger: 'enemy_turn',
				speaker: '프림',
				text: '방어를 하지 않고 상대의 공격을 받아버리면, 데미지 경감도 불가능한데다가, 추가로 무방비 페널티로 50%의 데미지를 더 받게 돼요.',
			},	
			{
				trigger: 'cycle_end',
				speaker: '프림',
				text: '이렇게 적, 아군 포함 모든 캐릭터가 턴을 종료하면, 한 사이클이 끝납니다! 다시 새로운 사이클이 시작되고, 모든 캐릭터가 턴 노트를 최대로 회복해요.',
			},	
			{
				trigger: 'player_turn',
				speaker: '프림',
				text: '자, 이제 이렇게 남은 적들도 처리해보죠!',
			},				
		],
		
	},
	{
		speaker: '프림',
		text: '해냈어요!',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},	
	{
		speaker: '프림',
		text: '역시 충분한 능력을 가지고 계실 줄 알았어요. 그럼... 계속 가 볼까요?',
		characters: [
			{name: '프림', image: '/uploads/standings/prim.png', position: 'center'},
		],
	},
	{
		label: 'tutorial_end',
		text: '튜토리얼 완료',
	},
];

export default tutorialScript;
