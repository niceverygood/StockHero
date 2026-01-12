import type { Question } from './types';

// Stage 1: 위험 성향 (Risk)
// Stage 2: 투자 스타일 (Growth vs Value)
// Stage 3: 투자 활동성 (Active vs Passive)
// Stage 4: 투자 기간 (Long vs Short)

export const QUIZ_QUESTIONS: Question[] = [
  // ============ Stage 1: 위험 성향 ============
  {
    id: 1,
    stage: 1,
    dimension: 'risk',
    question: '친구가 "이거 대박 날 것 같아!" 하며 신생 스타트업 투자를 권유합니다',
    subtitle: '당신의 반응은?',
    emoji: '🚀',
    options: [
      {
        text: '얼마나 넣으면 돼? 나도 한번 질러볼게!',
        value: 'R',
        emoji: '🔥',
        description: '기회는 잡아야지!'
      },
      {
        text: '음... 좀 더 알아보고 결정할게',
        value: 'S',
        emoji: '🤔',
        description: '신중하게 검토하자'
      }
    ]
  },
  {
    id: 2,
    stage: 1,
    dimension: 'risk',
    question: '주식 계좌에 -20%가 떴습니다',
    subtitle: '이때 당신의 심장 박동은?',
    emoji: '📉',
    options: [
      {
        text: '물타기 기회다! 추가 매수 고고',
        value: 'R',
        emoji: '💪',
        description: '하락은 기회'
      },
      {
        text: '일단 손절하고 다시 생각해보자...',
        value: 'S',
        emoji: '😰',
        description: '리스크 관리가 우선'
      }
    ]
  },
  {
    id: 3,
    stage: 1,
    dimension: 'risk',
    question: '카지노에 갔을 때 당신의 베팅 스타일은?',
    subtitle: '(투자와 비슷하다고 상상해보세요)',
    emoji: '🎰',
    options: [
      {
        text: '한 방에 인생역전! 큰 판에 올인',
        value: 'R',
        emoji: '🎲',
        description: '높은 리스크, 높은 리턴'
      },
      {
        text: '소액으로 오래오래 즐기기',
        value: 'S',
        emoji: '🎯',
        description: '적은 리스크로 꾸준히'
      }
    ]
  },

  // ============ Stage 2: 투자 스타일 ============
  {
    id: 4,
    stage: 2,
    dimension: 'style',
    question: '마트에서 물건을 고를 때 당신은?',
    subtitle: '투자 스타일과 연관이 있어요!',
    emoji: '🛒',
    options: [
      {
        text: '신상품 먼저 집어! 트렌드를 따라야지',
        value: 'G',
        emoji: '✨',
        description: '새로운 것에 끌린다'
      },
      {
        text: '할인 스티커 붙은 것부터 확인!',
        value: 'V',
        emoji: '🏷️',
        description: '가성비를 중시한다'
      }
    ]
  },
  {
    id: 5,
    stage: 2,
    dimension: 'style',
    question: '테슬라 vs 현대차, 어떤 회사가 더 끌려요?',
    subtitle: '직관적으로 선택해보세요',
    emoji: '🚗',
    options: [
      {
        text: '테슬라! 미래 기술에 투자해야지',
        value: 'G',
        emoji: '⚡',
        description: '성장 가능성 중시'
      },
      {
        text: '현대차! 안정적이고 저평가됐잖아',
        value: 'V',
        emoji: '🏭',
        description: '안정성과 가치 중시'
      }
    ]
  },
  {
    id: 6,
    stage: 2,
    dimension: 'style',
    question: 'PER 100인데 성장률 50% vs PER 10인데 성장률 5%',
    subtitle: '어떤 종목이 더 마음에 드나요?',
    emoji: '📊',
    options: [
      {
        text: '성장률 50%! 비싸도 성장하면 됨',
        value: 'G',
        emoji: '📈',
        description: '성장에 프리미엄 지불'
      },
      {
        text: 'PER 10! 싼 게 결국 남는 거야',
        value: 'V',
        emoji: '💎',
        description: '저평가 우량주 선호'
      }
    ]
  },

  // ============ Stage 3: 활동성 ============
  {
    id: 7,
    stage: 3,
    dimension: 'activity',
    question: '주식 앱 알림 설정, 어떻게 해두셨나요?',
    subtitle: '투자 관심도를 알 수 있어요',
    emoji: '📱',
    options: [
      {
        text: '실시간 알림 ON! 1초도 놓칠 수 없어',
        value: 'A',
        emoji: '🔔',
        description: '항상 시장을 주시'
      },
      {
        text: '알림 OFF, 일주일에 한번 보면 충분해',
        value: 'P',
        emoji: '🔕',
        description: '편안하게 기다리기'
      }
    ]
  },
  {
    id: 8,
    stage: 3,
    dimension: 'activity',
    question: '여행 계획을 세울 때 당신의 스타일은?',
    subtitle: '투자 스타일과 비슷해요!',
    emoji: '✈️',
    options: [
      {
        text: '분 단위로 짜인 완벽한 일정표 필수!',
        value: 'A',
        emoji: '📋',
        description: '계획적이고 적극적'
      },
      {
        text: '비행기랑 숙소만 예약, 나머지는 즉흥으로',
        value: 'P',
        emoji: '🎒',
        description: '유연하고 여유로움'
      }
    ]
  },
  {
    id: 9,
    stage: 3,
    dimension: 'activity',
    question: '좋아하는 운동 스타일은?',
    subtitle: '성격이 투자에 반영되더라구요',
    emoji: '🏃',
    options: [
      {
        text: '격렬한 운동! 땀 흘려야 운동한 것 같아',
        value: 'A',
        emoji: '🏋️',
        description: '적극적이고 열정적'
      },
      {
        text: '요가나 산책처럼 천천히 즐기는 게 좋아',
        value: 'P',
        emoji: '🧘',
        description: '차분하고 여유로움'
      }
    ]
  },

  // ============ Stage 4: 투자 기간 ============
  {
    id: 10,
    stage: 4,
    dimension: 'horizon',
    question: '로또 1등 당첨! 상금 어떻게 할래요?',
    subtitle: '시간 관점을 알 수 있어요',
    emoji: '🎉',
    options: [
      {
        text: '부동산이나 연금에 넣어서 평생 배당받기',
        value: 'L',
        emoji: '🏠',
        description: '장기적 안정 추구'
      },
      {
        text: '일단 당장 하고 싶은 것부터! YOLO',
        value: 'T',
        emoji: '🎊',
        description: '현재의 기회를 중시'
      }
    ]
  },
  {
    id: 11,
    stage: 4,
    dimension: 'horizon',
    question: '"10년 후 부자" vs "1년 후 소확행", 뭐가 더 끌려요?',
    subtitle: '투자 시간관을 알려줘요',
    emoji: '⏰',
    options: [
      {
        text: '10년 후 부자! 복리의 마법을 믿어',
        value: 'L',
        emoji: '🌱',
        description: '장기 복리 효과 중시'
      },
      {
        text: '1년 후 소확행! 인생 뭐 있어?',
        value: 'T',
        emoji: '🌸',
        description: '빠른 수익 실현 선호'
      }
    ]
  },
  {
    id: 12,
    stage: 4,
    dimension: 'horizon',
    question: '주식 매수 후 얼마나 기다릴 수 있어요?',
    subtitle: '솔직하게 답해주세요!',
    emoji: '⏳',
    options: [
      {
        text: '3년 이상도 OK! 믿음이 있으면 기다려',
        value: 'L',
        emoji: '🐢',
        description: '인내심 있는 장기 투자'
      },
      {
        text: '3개월이 한계... 빠른 결과가 좋아',
        value: 'T',
        emoji: '🐇',
        description: '빠른 성과 추구'
      }
    ]
  },
];

export const STAGE_INFO = [
  { stage: 1, title: '위험 성향', description: '당신은 모험가인가요, 신중파인가요?', emoji: '🎢', color: 'from-red-500 to-orange-500' },
  { stage: 2, title: '투자 스타일', description: '성장주와 가치주, 어떤 게 더 끌리나요?', emoji: '💡', color: 'from-blue-500 to-purple-500' },
  { stage: 3, title: '투자 활동성', description: '적극적인 매매파? 여유로운 존버파?', emoji: '⚡', color: 'from-green-500 to-teal-500' },
  { stage: 4, title: '투자 기간', description: '단타 vs 장기투자, 당신의 선택은?', emoji: '⏰', color: 'from-amber-500 to-yellow-500' },
];

export function getQuestionsByStage(stage: number): Question[] {
  return QUIZ_QUESTIONS.filter(q => q.stage === stage);
}

export function calculateInvestorType(answers: { dimension: string; value: string }[]): string {
  const dimensions = {
    risk: 'S',
    style: 'V',
    activity: 'P',
    horizon: 'L',
  };

  // 각 차원별로 더 많이 선택된 값으로 결정
  const counts: Record<string, Record<string, number>> = {
    risk: { R: 0, S: 0 },
    style: { G: 0, V: 0 },
    activity: { A: 0, P: 0 },
    horizon: { L: 0, T: 0 },
  };

  answers.forEach(answer => {
    if (counts[answer.dimension] && counts[answer.dimension][answer.value] !== undefined) {
      counts[answer.dimension][answer.value]++;
    }
  });

  // 각 차원에서 더 많은 쪽 선택
  if (counts.risk.R > counts.risk.S) dimensions.risk = 'R';
  if (counts.style.G > counts.style.V) dimensions.style = 'G';
  if (counts.activity.A > counts.activity.P) dimensions.activity = 'A';
  if (counts.horizon.T > counts.horizon.L) dimensions.horizon = 'T';

  return `${dimensions.risk}${dimensions.style}${dimensions.activity}${dimensions.horizon}`;
}




