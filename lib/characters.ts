import type { CharacterType } from './types';

export interface CharacterInfo {
  id: CharacterType;
  name: string;
  nameKo: string;
  role: string;
  roleKo: string;
  image: string;
  color: string;
  gradient: string;
  bgColor: string;
  description: string;
  tags: string[];
}

export const CHARACTERS: Record<CharacterType, CharacterInfo> = {
  claude: {
    id: 'claude',
    name: 'Claude Lee',
    nameKo: '클로드 리',
    role: 'Balanced Analyst',
    roleKo: '균형 분석가',
    image: '/images/characters/claude.png',
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
    description: '침착하고 분석적이며 디테일에 강함. 실적, 재무구조, 산업 구조를 깊이 파고드는 타입. 지나친 감정 배제, 부드럽지만 단단한 논리.',
    tags: ['Financials', 'Valuation'],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemi Nine',
    nameKo: '제미 나인',
    role: 'Future Trend Strategist',
    roleKo: '혁신 트렌드 전략가',
    image: '/images/characters/gemini.png',
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10',
    description: '세련됨, 센스, 빠른 판단. 신성장 산업, 기술주, 혁신 섹터 분석의 1인자. 감각적 사고와 데이터 스캔 능력.',
    tags: ['Tech Trends', 'Innovation'],
  },
  gpt: {
    id: 'gpt',
    name: 'G.P. Taylor',
    nameKo: '지피 테일러',
    role: 'Chief Macro & Risk Officer',
    roleKo: '수석 장기전략 리스크 총괄',
    image: '/images/characters/gpt.png',
    color: 'text-violet-400',
    gradient: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500/10',
    description: '중후함, 느긋함, 깊은 통찰. 거시경제, 금리, 위험요인 분석의 원로 애널리스트. 말투가 부드럽지만 권위 있음.',
    tags: ['Macro', 'Risk'],
  },
};

export function getCharacter(type: CharacterType): CharacterInfo {
  return CHARACTERS[type];
}

