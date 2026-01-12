// 핫 테마 데이터 - 국내 + 해외 주식 통합

export interface ThemeStock {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  marketCap?: string;
  description?: string;
  // 재무 지표
  per?: number;
  pbr?: number;
  roe?: number;
  growth?: number;
  dividend?: number;
}

export interface HotTheme {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  trend: 'rising' | 'stable' | 'hot';
  stocks: ThemeStock[];
}

export const HOT_THEMES: HotTheme[] = [
  {
    id: 'robotics',
    name: '로봇/자동화',
    nameEn: 'Robotics & Automation',
    icon: '🤖',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    description: '휴머노이드 로봇, 산업용 로봇, 자동화 솔루션',
    trend: 'hot',
    stocks: [
      // 한국
      { symbol: '267260', name: '현대로보틱스', market: 'KR', per: 45, pbr: 2.1, roe: 8, growth: 25 },
      { symbol: '090460', name: '비에이치', market: 'KR', per: 15, pbr: 1.8, roe: 12, growth: 30 },
      { symbol: '108860', name: '셀바스AI', market: 'KR', per: 0, pbr: 3.5, roe: -5, growth: 40 },
      { symbol: '336570', name: '원익피앤이', market: 'KR', per: 25, pbr: 2.0, roe: 10, growth: 35 },
      { symbol: '377480', name: '레인보우로보틱스', market: 'KR', per: 0, pbr: 8.5, roe: -15, growth: 80 },
      { symbol: '460860', name: '두산로보틱스', market: 'KR', per: 0, pbr: 12, roe: -20, growth: 100 },
      { symbol: '492170', name: '케이엔알시스템', market: 'KR', per: 30, pbr: 3.2, roe: 15, growth: 45 },
      { symbol: '499000', name: '엔젤로보틱스', market: 'KR', per: 0, pbr: 5.0, roe: -10, growth: 60 },
      // 미국
      { symbol: 'NVDA', name: 'NVIDIA', market: 'US', per: 65, pbr: 45, roe: 85, growth: 120, marketCap: '$3.4T' },
      { symbol: 'ISRG', name: 'Intuitive Surgical', market: 'US', per: 70, pbr: 12, roe: 15, growth: 18, marketCap: '$180B' },
      { symbol: 'ROK', name: 'Rockwell Automation', market: 'US', per: 28, pbr: 8, roe: 30, growth: 12, marketCap: '$30B' },
      { symbol: 'ABB', name: 'ABB Ltd', market: 'US', per: 22, pbr: 4.5, roe: 20, growth: 15, marketCap: '$95B' },
      { symbol: 'FANUY', name: 'FANUC', market: 'US', per: 35, pbr: 3.2, roe: 12, growth: 10, marketCap: '$35B' },
      { symbol: 'TER', name: 'Teradyne', market: 'US', per: 32, pbr: 6.5, roe: 22, growth: 20, marketCap: '$18B' },
      { symbol: 'PATH', name: 'UiPath', market: 'US', per: 0, pbr: 8, roe: -5, growth: 25, marketCap: '$8B' },
      { symbol: 'TSLA', name: 'Tesla (Optimus)', market: 'US', per: 85, pbr: 15, roe: 20, growth: 50, marketCap: '$800B' },
    ],
  },
  {
    id: 'space',
    name: '우주항공',
    nameEn: 'Space & Aerospace',
    icon: '🚀',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    description: '위성, 로켓, 우주 탐사, 방산',
    trend: 'hot',
    stocks: [
      // 한국
      { symbol: '012450', name: '한화에어로스페이스', market: 'KR', per: 25, pbr: 3.5, roe: 15, growth: 40 },
      { symbol: '047810', name: '한국항공우주', market: 'KR', per: 20, pbr: 2.8, roe: 12, growth: 35 },
      { symbol: '298540', name: 'LIG넥스원', market: 'KR', per: 18, pbr: 2.2, roe: 14, growth: 30 },
      { symbol: '082660', name: '코세스', market: 'KR', per: 15, pbr: 1.5, roe: 10, growth: 25 },
      { symbol: '141080', name: '쎄트렉아이', market: 'KR', per: 35, pbr: 4.0, roe: 8, growth: 45 },
      { symbol: '331380', name: '이노스페이스', market: 'KR', per: 0, pbr: 15, roe: -25, growth: 150 },
      { symbol: '434370', name: '켄코아에어로스페이스', market: 'KR', per: 0, pbr: 8, roe: -10, growth: 80 },
      // 미국
      { symbol: 'LMT', name: 'Lockheed Martin', market: 'US', per: 18, pbr: 15, roe: 80, growth: 8, marketCap: '$130B' },
      { symbol: 'RTX', name: 'RTX Corp', market: 'US', per: 35, pbr: 2.5, roe: 8, growth: 12, marketCap: '$155B' },
      { symbol: 'BA', name: 'Boeing', market: 'US', per: 0, pbr: 0, roe: -50, growth: 15, marketCap: '$115B' },
      { symbol: 'NOC', name: 'Northrop Grumman', market: 'US', per: 20, pbr: 5, roe: 25, growth: 10, marketCap: '$75B' },
      { symbol: 'RKLB', name: 'Rocket Lab', market: 'US', per: 0, pbr: 8, roe: -20, growth: 60, marketCap: '$10B' },
      { symbol: 'ASTS', name: 'AST SpaceMobile', market: 'US', per: 0, pbr: 25, roe: -80, growth: 200, marketCap: '$8B' },
      { symbol: 'RDW', name: 'Redwire', market: 'US', per: 0, pbr: 5, roe: -15, growth: 50, marketCap: '$1B' },
      { symbol: 'LUNR', name: 'Intuitive Machines', market: 'US', per: 0, pbr: 10, roe: -30, growth: 100, marketCap: '$2B' },
    ],
  },
  {
    id: 'ai-semiconductor',
    name: 'AI/반도체',
    nameEn: 'AI & Semiconductors',
    icon: '🧠',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    description: 'AI 칩, HBM, GPU, 파운드리',
    trend: 'hot',
    stocks: [
      // 한국
      { symbol: '005930', name: '삼성전자', market: 'KR', per: 25, pbr: 1.2, roe: 8, growth: 15 },
      { symbol: '000660', name: 'SK하이닉스', market: 'KR', per: 8, pbr: 1.8, roe: 25, growth: 80 },
      { symbol: '402340', name: 'SK스퀘어', market: 'KR', per: 15, pbr: 0.8, roe: 10, growth: 20 },
      { symbol: '042700', name: '한미반도체', market: 'KR', per: 35, pbr: 8, roe: 30, growth: 60 },
      { symbol: '403870', name: 'HPSP', market: 'KR', per: 40, pbr: 12, roe: 35, growth: 70 },
      { symbol: '058470', name: '리노공업', market: 'KR', per: 25, pbr: 5, roe: 22, growth: 40 },
      { symbol: '107640', name: '한중엔시에스', market: 'KR', per: 20, pbr: 3.5, roe: 18, growth: 35 },
      // 미국
      { symbol: 'NVDA', name: 'NVIDIA', market: 'US', per: 65, pbr: 45, roe: 85, growth: 120, marketCap: '$3.4T' },
      { symbol: 'AMD', name: 'AMD', market: 'US', per: 120, pbr: 4, roe: 5, growth: 25, marketCap: '$220B' },
      { symbol: 'AVGO', name: 'Broadcom', market: 'US', per: 35, pbr: 12, roe: 35, growth: 40, marketCap: '$800B' },
      { symbol: 'TSM', name: 'TSMC', market: 'US', per: 25, pbr: 6, roe: 28, growth: 30, marketCap: '$900B' },
      { symbol: 'ASML', name: 'ASML', market: 'US', per: 40, pbr: 20, roe: 55, growth: 25, marketCap: '$350B' },
      { symbol: 'MRVL', name: 'Marvell', market: 'US', per: 70, pbr: 5, roe: 8, growth: 35, marketCap: '$80B' },
      { symbol: 'ARM', name: 'ARM Holdings', market: 'US', per: 200, pbr: 25, roe: 15, growth: 45, marketCap: '$150B' },
      { symbol: 'MU', name: 'Micron', market: 'US', per: 15, pbr: 2.5, roe: 18, growth: 50, marketCap: '$110B' },
    ],
  },
  {
    id: 'ev-battery',
    name: '전기차/배터리',
    nameEn: 'EV & Battery',
    icon: '🔋',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    description: '전기차, 2차전지, 충전 인프라',
    trend: 'stable',
    stocks: [
      // 한국
      { symbol: '373220', name: 'LG에너지솔루션', market: 'KR', per: 80, pbr: 4, roe: 5, growth: 20 },
      { symbol: '006400', name: '삼성SDI', market: 'KR', per: 25, pbr: 1.5, roe: 8, growth: 15 },
      { symbol: '051910', name: 'LG화학', market: 'KR', per: 30, pbr: 1.2, roe: 6, growth: 12 },
      { symbol: '247540', name: '에코프로비엠', market: 'KR', per: 50, pbr: 8, roe: 18, growth: 40 },
      { symbol: '086520', name: '에코프로', market: 'KR', per: 45, pbr: 6, roe: 15, growth: 35 },
      { symbol: '005380', name: '현대차', market: 'KR', per: 5, pbr: 0.5, roe: 12, growth: 10 },
      { symbol: '000270', name: '기아', market: 'KR', per: 4, pbr: 0.8, roe: 18, growth: 15 },
      // 미국
      { symbol: 'TSLA', name: 'Tesla', market: 'US', per: 85, pbr: 15, roe: 20, growth: 50, marketCap: '$800B' },
      { symbol: 'RIVN', name: 'Rivian', market: 'US', per: 0, pbr: 2, roe: -50, growth: 80, marketCap: '$15B' },
      { symbol: 'LCID', name: 'Lucid', market: 'US', per: 0, pbr: 1.5, roe: -80, growth: 100, marketCap: '$8B' },
      { symbol: 'QS', name: 'QuantumScape', market: 'US', per: 0, pbr: 8, roe: -30, growth: 150, marketCap: '$5B' },
      { symbol: 'CHPT', name: 'ChargePoint', market: 'US', per: 0, pbr: 2, roe: -40, growth: 30, marketCap: '$1B' },
      { symbol: 'ALB', name: 'Albemarle', market: 'US', per: 8, pbr: 1.5, roe: 20, growth: 25, marketCap: '$12B' },
      { symbol: 'PANW', name: 'Panasonic (ADR)', market: 'US', per: 15, pbr: 1.2, roe: 10, growth: 15, marketCap: '$25B' },
      { symbol: 'BYD', name: 'BYD (ADR)', market: 'US', per: 20, pbr: 3, roe: 18, growth: 40, marketCap: '$100B' },
    ],
  },
  {
    id: 'biotech',
    name: '바이오/헬스케어',
    nameEn: 'Biotech & Healthcare',
    icon: '🧬',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    description: 'AI 신약, 세포치료, 의료기기',
    trend: 'rising',
    stocks: [
      // 한국
      { symbol: '207940', name: '삼성바이오로직스', market: 'KR', per: 60, pbr: 8, roe: 12, growth: 25 },
      { symbol: '068270', name: '셀트리온', market: 'KR', per: 35, pbr: 3.5, roe: 10, growth: 20 },
      { symbol: '326030', name: 'SK바이오팜', market: 'KR', per: 100, pbr: 10, roe: 8, growth: 35 },
      { symbol: '145020', name: '휴젤', market: 'KR', per: 25, pbr: 5, roe: 22, growth: 30 },
      { symbol: '196170', name: '알테오젠', market: 'KR', per: 150, pbr: 30, roe: 20, growth: 80 },
      { symbol: '457190', name: '루닛', market: 'KR', per: 0, pbr: 25, roe: -30, growth: 100 },
      { symbol: '950160', name: '코아스템켐온', market: 'KR', per: 0, pbr: 15, roe: -40, growth: 120 },
      // 미국
      { symbol: 'LLY', name: 'Eli Lilly', market: 'US', per: 80, pbr: 55, roe: 70, growth: 35, marketCap: '$750B' },
      { symbol: 'NVO', name: 'Novo Nordisk', market: 'US', per: 45, pbr: 35, roe: 80, growth: 30, marketCap: '$450B' },
      { symbol: 'MRNA', name: 'Moderna', market: 'US', per: 0, pbr: 2, roe: -20, growth: 40, marketCap: '$20B' },
      { symbol: 'REGN', name: 'Regeneron', market: 'US', per: 22, pbr: 4, roe: 20, growth: 15, marketCap: '$100B' },
      { symbol: 'VRTX', name: 'Vertex', market: 'US', per: 28, pbr: 8, roe: 30, growth: 20, marketCap: '$120B' },
      { symbol: 'ILMN', name: 'Illumina', market: 'US', per: 50, pbr: 5, roe: 10, growth: 15, marketCap: '$20B' },
      { symbol: 'CRSP', name: 'CRISPR', market: 'US', per: 0, pbr: 3, roe: -15, growth: 60, marketCap: '$5B' },
      { symbol: 'RXRX', name: 'Recursion', market: 'US', per: 0, pbr: 5, roe: -50, growth: 80, marketCap: '$3B' },
    ],
  },
  {
    id: 'nuclear',
    name: '원자력/SMR',
    nameEn: 'Nuclear & SMR',
    icon: '⚛️',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    description: '소형모듈원자로, 원전 해체, 우라늄',
    trend: 'hot',
    stocks: [
      // 한국
      { symbol: '009830', name: '한화솔루션', market: 'KR', per: 0, pbr: 0.8, roe: -5, growth: 20 },
      { symbol: '034020', name: '두산에너빌리티', market: 'KR', per: 25, pbr: 2.5, roe: 12, growth: 40 },
      { symbol: '267250', name: '현대중공업', market: 'KR', per: 15, pbr: 1.5, roe: 10, growth: 25 },
      { symbol: '490770', name: '우진엔텍', market: 'KR', per: 30, pbr: 5, roe: 18, growth: 50 },
      { symbol: '044180', name: 'KD', market: 'KR', per: 20, pbr: 2, roe: 12, growth: 30 },
      { symbol: '009450', name: '경동나비엔', market: 'KR', per: 12, pbr: 1.5, roe: 15, growth: 20 },
      // 미국
      { symbol: 'CEG', name: 'Constellation Energy', market: 'US', per: 30, pbr: 4, roe: 15, growth: 25, marketCap: '$75B' },
      { symbol: 'VST', name: 'Vistra', market: 'US', per: 25, pbr: 5, roe: 20, growth: 30, marketCap: '$45B' },
      { symbol: 'CCJ', name: 'Cameco', market: 'US', per: 50, pbr: 4, roe: 8, growth: 35, marketCap: '$25B' },
      { symbol: 'SMR', name: 'NuScale Power', market: 'US', per: 0, pbr: 10, roe: -50, growth: 150, marketCap: '$3B' },
      { symbol: 'OKLO', name: 'Oklo', market: 'US', per: 0, pbr: 20, roe: -80, growth: 200, marketCap: '$2B' },
      { symbol: 'LEU', name: 'Centrus Energy', market: 'US', per: 15, pbr: 8, roe: 60, growth: 40, marketCap: '$1.5B' },
      { symbol: 'DNN', name: 'Denison Mines', market: 'US', per: 0, pbr: 3, roe: -5, growth: 50, marketCap: '$2B' },
      { symbol: 'UEC', name: 'Uranium Energy', market: 'US', per: 0, pbr: 4, roe: -10, growth: 80, marketCap: '$3B' },
    ],
  },
  {
    id: 'quantum',
    name: '양자컴퓨팅',
    nameEn: 'Quantum Computing',
    icon: '💠',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    description: '양자 컴퓨터, 양자 암호, 양자 센서',
    trend: 'rising',
    stocks: [
      // 한국
      { symbol: '005930', name: '삼성전자', market: 'KR', per: 25, pbr: 1.2, roe: 8, growth: 15, description: '양자컴퓨팅 연구' },
      { symbol: '402340', name: 'SK스퀘어', market: 'KR', per: 15, pbr: 0.8, roe: 10, growth: 20, description: '양자 투자' },
      { symbol: '035420', name: 'NAVER', market: 'KR', per: 35, pbr: 2.5, roe: 8, growth: 15, description: '양자 암호 연구' },
      // 미국
      { symbol: 'IONQ', name: 'IonQ', market: 'US', per: 0, pbr: 15, roe: -60, growth: 100, marketCap: '$8B' },
      { symbol: 'RGTI', name: 'Rigetti Computing', market: 'US', per: 0, pbr: 8, roe: -80, growth: 150, marketCap: '$3B' },
      { symbol: 'QBTS', name: 'D-Wave Quantum', market: 'US', per: 0, pbr: 10, roe: -70, growth: 120, marketCap: '$2B' },
      { symbol: 'IBM', name: 'IBM', market: 'US', per: 22, pbr: 8, roe: 35, growth: 8, marketCap: '$200B' },
      { symbol: 'GOOG', name: 'Alphabet', market: 'US', per: 25, pbr: 6, roe: 28, growth: 15, marketCap: '$2T' },
      { symbol: 'MSFT', name: 'Microsoft', market: 'US', per: 35, pbr: 12, roe: 40, growth: 18, marketCap: '$3T' },
      { symbol: 'QUBT', name: 'Quantum Computing Inc', market: 'US', per: 0, pbr: 20, roe: -90, growth: 200, marketCap: '$1B' },
    ],
  },
  {
    id: 'defense',
    name: '방위산업',
    nameEn: 'Defense',
    icon: '🛡️',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    description: '무기체계, 드론, 사이버 보안',
    trend: 'hot',
    stocks: [
      // 한국
      { symbol: '012450', name: '한화에어로스페이스', market: 'KR', per: 25, pbr: 3.5, roe: 15, growth: 40 },
      { symbol: '298540', name: 'LIG넥스원', market: 'KR', per: 18, pbr: 2.2, roe: 14, growth: 30 },
      { symbol: '047810', name: '한국항공우주', market: 'KR', per: 20, pbr: 2.8, roe: 12, growth: 35 },
      { symbol: '000880', name: '한화', market: 'KR', per: 8, pbr: 0.5, roe: 8, growth: 15 },
      { symbol: '272210', name: '한화시스템', market: 'KR', per: 35, pbr: 3, roe: 10, growth: 25 },
      { symbol: '064350', name: '현대로템', market: 'KR', per: 15, pbr: 1.8, roe: 12, growth: 30 },
      // 미국
      { symbol: 'LMT', name: 'Lockheed Martin', market: 'US', per: 18, pbr: 15, roe: 80, growth: 8, marketCap: '$130B' },
      { symbol: 'RTX', name: 'RTX Corp', market: 'US', per: 35, pbr: 2.5, roe: 8, growth: 12, marketCap: '$155B' },
      { symbol: 'NOC', name: 'Northrop Grumman', market: 'US', per: 20, pbr: 5, roe: 25, growth: 10, marketCap: '$75B' },
      { symbol: 'GD', name: 'General Dynamics', market: 'US', per: 22, pbr: 4, roe: 18, growth: 8, marketCap: '$80B' },
      { symbol: 'LHX', name: 'L3Harris', market: 'US', per: 25, pbr: 3, roe: 12, growth: 10, marketCap: '$45B' },
      { symbol: 'PLTR', name: 'Palantir', market: 'US', per: 200, pbr: 20, roe: 10, growth: 30, marketCap: '$150B' },
      { symbol: 'LDOS', name: 'Leidos', market: 'US', per: 20, pbr: 4, roe: 20, growth: 12, marketCap: '$20B' },
      { symbol: 'KTOS', name: 'Kratos Defense', market: 'US', per: 80, pbr: 4, roe: 5, growth: 25, marketCap: '$4B' },
    ],
  },
];

// 테마 트렌드별 필터
export const getThemesByTrend = (trend: 'rising' | 'stable' | 'hot') => {
  return HOT_THEMES.filter(theme => theme.trend === trend);
};

// 테마 ID로 찾기
export const getThemeById = (id: string) => {
  return HOT_THEMES.find(theme => theme.id === id);
};

// 특정 테마의 국내/해외 주식 분리
export const getThemeStocksByMarket = (themeId: string, market: 'KR' | 'US') => {
  const theme = getThemeById(themeId);
  if (!theme) return [];
  return theme.stocks.filter(stock => stock.market === market);
};






