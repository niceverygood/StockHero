/**
 * 종목 마스터 데이터
 * - 섹터 분류
 * - 기본 재무 지표
 * - 스크리닝용 메타데이터
 */

export type Sector = 
  | 'semiconductor'    // 반도체
  | 'battery'          // 2차전지
  | 'bio'              // 바이오
  | 'auto'             // 자동차
  | 'it_service'       // IT서비스
  | 'finance'          // 금융
  | 'telecom'          // 통신
  | 'chemical'         // 화학
  | 'steel'            // 철강
  | 'retail'           // 유통
  | 'construction'     // 건설
  | 'energy'           // 에너지
  | 'entertainment'    // 엔터테인먼트
  | 'food'             // 식품
  | 'insurance'        // 보험
  | 'holding'          // 지주회사
  | 'other';           // 기타

export const SECTOR_NAMES: Record<Sector, string> = {
  semiconductor: '반도체',
  battery: '2차전지',
  bio: '바이오',
  auto: '자동차',
  it_service: 'IT서비스',
  finance: '금융',
  telecom: '통신',
  chemical: '화학',
  steel: '철강',
  retail: '유통',
  construction: '건설',
  energy: '에너지',
  entertainment: '엔터테인먼트',
  food: '식품',
  insurance: '보험',
  holding: '지주회사',
  other: '기타',
};

// 섹터별 특성 (캐릭터별 선호도에 사용)
export const SECTOR_CHARACTERISTICS: Record<Sector, {
  isGrowth: boolean;      // 성장주 섹터
  isDefensive: boolean;   // 방어주 섹터
  isValue: boolean;       // 가치주 섹터
  volatility: 'high' | 'medium' | 'low';
}> = {
  semiconductor: { isGrowth: true, isDefensive: false, isValue: false, volatility: 'high' },
  battery: { isGrowth: true, isDefensive: false, isValue: false, volatility: 'high' },
  bio: { isGrowth: true, isDefensive: false, isValue: false, volatility: 'high' },
  auto: { isGrowth: false, isDefensive: false, isValue: true, volatility: 'medium' },
  it_service: { isGrowth: true, isDefensive: false, isValue: false, volatility: 'medium' },
  finance: { isGrowth: false, isDefensive: true, isValue: true, volatility: 'low' },
  telecom: { isGrowth: false, isDefensive: true, isValue: true, volatility: 'low' },
  chemical: { isGrowth: false, isDefensive: false, isValue: true, volatility: 'medium' },
  steel: { isGrowth: false, isDefensive: false, isValue: true, volatility: 'medium' },
  retail: { isGrowth: false, isDefensive: true, isValue: false, volatility: 'low' },
  construction: { isGrowth: false, isDefensive: false, isValue: true, volatility: 'medium' },
  energy: { isGrowth: false, isDefensive: true, isValue: true, volatility: 'medium' },
  entertainment: { isGrowth: true, isDefensive: false, isValue: false, volatility: 'high' },
  food: { isGrowth: false, isDefensive: true, isValue: false, volatility: 'low' },
  insurance: { isGrowth: false, isDefensive: true, isValue: true, volatility: 'low' },
  holding: { isGrowth: false, isDefensive: false, isValue: true, volatility: 'medium' },
  other: { isGrowth: false, isDefensive: false, isValue: false, volatility: 'medium' },
};

export interface StockFinancials {
  // 밸류에이션 지표
  per: number;              // 주가수익비율 (Price to Earnings Ratio)
  pbr: number;              // 주가순자산비율 (Price to Book Ratio)
  psr: number;              // 주가매출비율 (Price to Sales Ratio)
  
  // 수익성 지표
  roe: number;              // 자기자본이익률 (%)
  roa: number;              // 총자산이익률 (%)
  operatingMargin: number;  // 영업이익률 (%)
  netProfitMargin: number;  // 순이익률 (%)
  
  // 성장성 지표
  revenueGrowth: number;    // 매출성장률 (%, YoY)
  earningsGrowth: number;   // 이익성장률 (%, YoY)
  
  // 안정성 지표
  debtRatio: number;        // 부채비율 (%)
  currentRatio: number;     // 유동비율 (%)
  
  // 배당 지표
  dividendYield: number;    // 배당수익률 (%)
  payoutRatio: number;      // 배당성향 (%)
  
  // 시장 지표
  beta: number;             // 베타 (시장 대비 변동성)
  marketCap: number;        // 시가총액 (억원)
}

export interface StockMaster {
  symbol: string;
  name: string;
  nameEn: string;
  sector: Sector;
  market: 'KOSPI' | 'KOSDAQ';
  isKospi200: boolean;      // 코스피200 편입 여부
  financials: StockFinancials;
  updatedAt: string;
}

/**
 * 종목 마스터 데이터
 * 실제로는 DB 또는 외부 API에서 가져와야 하지만,
 * 우선 주요 종목 데이터를 하드코딩
 */
export const STOCK_MASTER: StockMaster[] = [
  // === 반도체 ===
  {
    symbol: '005930',
    name: '삼성전자',
    nameEn: 'Samsung Electronics',
    sector: 'semiconductor',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 15.2, pbr: 1.1, psr: 1.8,
      roe: 8.5, roa: 5.2, operatingMargin: 12.5, netProfitMargin: 10.2,
      revenueGrowth: 5.2, earningsGrowth: -15.3,
      debtRatio: 25, currentRatio: 250,
      dividendYield: 2.5, payoutRatio: 35,
      beta: 1.1, marketCap: 4500000, // 450조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '000660',
    name: 'SK하이닉스',
    nameEn: 'SK Hynix',
    sector: 'semiconductor',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 8.5, pbr: 1.8, psr: 2.5,
      roe: 22.1, roa: 12.5, operatingMargin: 28.5, netProfitMargin: 22.3,
      revenueGrowth: 45.2, earningsGrowth: 120.5,
      debtRatio: 35, currentRatio: 180,
      dividendYield: 1.2, payoutRatio: 15,
      beta: 1.4, marketCap: 750000, // 75조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 2차전지 ===
  {
    symbol: '373220',
    name: 'LG에너지솔루션',
    nameEn: 'LG Energy Solution',
    sector: 'battery',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 45.2, pbr: 3.2, psr: 2.8,
      roe: 8.2, roa: 4.5, operatingMargin: 8.5, netProfitMargin: 5.2,
      revenueGrowth: 35.5, earningsGrowth: 25.3,
      debtRatio: 55, currentRatio: 150,
      dividendYield: 0, payoutRatio: 0,
      beta: 1.3, marketCap: 850000, // 85조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '006400',
    name: '삼성SDI',
    nameEn: 'Samsung SDI',
    sector: 'battery',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 18.5, pbr: 1.5, psr: 1.2,
      roe: 9.5, roa: 5.8, operatingMargin: 10.2, netProfitMargin: 7.5,
      revenueGrowth: 22.3, earningsGrowth: 18.5,
      debtRatio: 42, currentRatio: 165,
      dividendYield: 0.8, payoutRatio: 12,
      beta: 1.25, marketCap: 250000, // 25조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '247540',
    name: '에코프로비엠',
    nameEn: 'Ecopro BM',
    sector: 'battery',
    market: 'KOSDAQ',
    isKospi200: false,
    financials: {
      per: 35.2, pbr: 5.5, psr: 3.2,
      roe: 18.5, roa: 8.2, operatingMargin: 12.5, netProfitMargin: 8.5,
      revenueGrowth: 40.2, earningsGrowth: 55.3,
      debtRatio: 85, currentRatio: 120,
      dividendYield: 0, payoutRatio: 0,
      beta: 1.8, marketCap: 120000, // 12조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 바이오 ===
  {
    symbol: '207940',
    name: '삼성바이오로직스',
    nameEn: 'Samsung Biologics',
    sector: 'bio',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 55.2, pbr: 6.5, psr: 15.2,
      roe: 12.5, roa: 8.2, operatingMargin: 32.5, netProfitMargin: 25.3,
      revenueGrowth: 18.5, earningsGrowth: 22.3,
      debtRatio: 25, currentRatio: 280,
      dividendYield: 0, payoutRatio: 0,
      beta: 0.95, marketCap: 550000, // 55조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '068270',
    name: '셀트리온',
    nameEn: 'Celltrion',
    sector: 'bio',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 28.5, pbr: 3.8, psr: 8.5,
      roe: 15.2, roa: 10.5, operatingMargin: 28.5, netProfitMargin: 22.5,
      revenueGrowth: 12.5, earningsGrowth: 15.3,
      debtRatio: 18, currentRatio: 320,
      dividendYield: 0.5, payoutRatio: 10,
      beta: 1.1, marketCap: 250000, // 25조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 자동차 ===
  {
    symbol: '005380',
    name: '현대차',
    nameEn: 'Hyundai Motor',
    sector: 'auto',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 5.8, pbr: 0.55, psr: 0.35,
      roe: 12.5, roa: 4.5, operatingMargin: 8.5, netProfitMargin: 6.2,
      revenueGrowth: 8.5, earningsGrowth: 12.3,
      debtRatio: 145, currentRatio: 115,
      dividendYield: 4.2, payoutRatio: 22,
      beta: 1.05, marketCap: 450000, // 45조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '000270',
    name: '기아',
    nameEn: 'Kia',
    sector: 'auto',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 4.5, pbr: 0.65, psr: 0.32,
      roe: 18.5, roa: 6.2, operatingMargin: 11.5, netProfitMargin: 8.5,
      revenueGrowth: 12.5, earningsGrowth: 25.3,
      debtRatio: 125, currentRatio: 120,
      dividendYield: 5.5, payoutRatio: 25,
      beta: 1.15, marketCap: 380000, // 38조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '012330',
    name: '현대모비스',
    nameEn: 'Hyundai Mobis',
    sector: 'auto',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 6.2, pbr: 0.48, psr: 0.28,
      roe: 8.5, roa: 3.8, operatingMargin: 5.5, netProfitMargin: 4.2,
      revenueGrowth: 5.2, earningsGrowth: 8.5,
      debtRatio: 85, currentRatio: 135,
      dividendYield: 3.8, payoutRatio: 22,
      beta: 0.95, marketCap: 220000, // 22조
    },
    updatedAt: '2024-12-16',
  },
  
  // === IT서비스 ===
  {
    symbol: '035420',
    name: 'NAVER',
    nameEn: 'NAVER',
    sector: 'it_service',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 18.5, pbr: 1.4, psr: 3.2,
      roe: 12.3, roa: 6.5, operatingMargin: 18.5, netProfitMargin: 12.5,
      revenueGrowth: 15.2, earningsGrowth: 18.5,
      debtRatio: 35, currentRatio: 185,
      dividendYield: 0.5, payoutRatio: 8,
      beta: 1.15, marketCap: 380000, // 38조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '035720',
    name: '카카오',
    nameEn: 'Kakao',
    sector: 'it_service',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 45.5, pbr: 1.8, psr: 2.5,
      roe: 5.2, roa: 2.8, operatingMargin: 8.5, netProfitMargin: 5.5,
      revenueGrowth: 8.5, earningsGrowth: -25.3,
      debtRatio: 55, currentRatio: 145,
      dividendYield: 0, payoutRatio: 0,
      beta: 1.35, marketCap: 180000, // 18조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 금융 ===
  {
    symbol: '105560',
    name: 'KB금융',
    nameEn: 'KB Financial Group',
    sector: 'finance',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 6.2, pbr: 0.52, psr: 1.5,
      roe: 9.8, roa: 0.65, operatingMargin: 35.2, netProfitMargin: 22.5,
      revenueGrowth: 5.5, earningsGrowth: 8.2,
      debtRatio: 0, currentRatio: 0, // 금융회사는 해당 없음
      dividendYield: 5.1, payoutRatio: 28,
      beta: 0.85, marketCap: 320000, // 32조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '055550',
    name: '신한지주',
    nameEn: 'Shinhan Financial Group',
    sector: 'finance',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 5.8, pbr: 0.48, psr: 1.2,
      roe: 9.2, roa: 0.62, operatingMargin: 32.5, netProfitMargin: 20.5,
      revenueGrowth: 4.5, earningsGrowth: 6.8,
      debtRatio: 0, currentRatio: 0,
      dividendYield: 4.8, payoutRatio: 26,
      beta: 0.82, marketCap: 260000, // 26조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '086790',
    name: '하나금융지주',
    nameEn: 'Hana Financial Group',
    sector: 'finance',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 5.2, pbr: 0.45, psr: 1.1,
      roe: 10.2, roa: 0.68, operatingMargin: 34.5, netProfitMargin: 21.5,
      revenueGrowth: 6.2, earningsGrowth: 9.5,
      debtRatio: 0, currentRatio: 0,
      dividendYield: 5.5, payoutRatio: 28,
      beta: 0.88, marketCap: 180000, // 18조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 통신 ===
  {
    symbol: '017670',
    name: 'SK텔레콤',
    nameEn: 'SK Telecom',
    sector: 'telecom',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 10.5, pbr: 0.85, psr: 1.2,
      roe: 8.2, roa: 4.5, operatingMargin: 12.5, netProfitMargin: 8.5,
      revenueGrowth: 2.5, earningsGrowth: 5.2,
      debtRatio: 45, currentRatio: 95,
      dividendYield: 4.2, payoutRatio: 42,
      beta: 0.65, marketCap: 130000, // 13조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '030200',
    name: 'KT',
    nameEn: 'KT Corporation',
    sector: 'telecom',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 8.5, pbr: 0.55, psr: 0.45,
      roe: 6.5, roa: 2.8, operatingMargin: 8.5, netProfitMargin: 5.2,
      revenueGrowth: 1.5, earningsGrowth: 3.5,
      debtRatio: 85, currentRatio: 85,
      dividendYield: 4.5, payoutRatio: 38,
      beta: 0.55, marketCap: 95000, // 9.5조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '032640',
    name: 'LG유플러스',
    nameEn: 'LG Uplus',
    sector: 'telecom',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 7.5, pbr: 0.52, psr: 0.38,
      roe: 7.2, roa: 3.2, operatingMargin: 9.5, netProfitMargin: 6.2,
      revenueGrowth: 2.2, earningsGrowth: 4.5,
      debtRatio: 95, currentRatio: 75,
      dividendYield: 5.2, payoutRatio: 40,
      beta: 0.58, marketCap: 55000, // 5.5조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 화학 ===
  {
    symbol: '051910',
    name: 'LG화학',
    nameEn: 'LG Chem',
    sector: 'chemical',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 25.5, pbr: 1.2, psr: 0.85,
      roe: 5.5, roa: 2.5, operatingMargin: 5.2, netProfitMargin: 3.5,
      revenueGrowth: 8.5, earningsGrowth: -15.2,
      debtRatio: 85, currentRatio: 125,
      dividendYield: 1.5, payoutRatio: 35,
      beta: 1.15, marketCap: 210000, // 21조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 철강 ===
  {
    symbol: '005490',
    name: 'POSCO홀딩스',
    nameEn: 'POSCO Holdings',
    sector: 'steel',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 8.5, pbr: 0.45, psr: 0.35,
      roe: 5.8, roa: 2.5, operatingMargin: 6.5, netProfitMargin: 4.2,
      revenueGrowth: 2.5, earningsGrowth: -8.5,
      debtRatio: 55, currentRatio: 145,
      dividendYield: 3.8, payoutRatio: 32,
      beta: 1.05, marketCap: 280000, // 28조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 보험 ===
  {
    symbol: '032830',
    name: '삼성생명',
    nameEn: 'Samsung Life Insurance',
    sector: 'insurance',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 8.2, pbr: 0.35, psr: 0.85,
      roe: 4.5, roa: 0.35, operatingMargin: 15.5, netProfitMargin: 8.5,
      revenueGrowth: 3.5, earningsGrowth: 12.5,
      debtRatio: 0, currentRatio: 0,
      dividendYield: 3.8, payoutRatio: 30,
      beta: 0.75, marketCap: 150000, // 15조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 지주회사 ===
  {
    symbol: '034730',
    name: 'SK',
    nameEn: 'SK Inc',
    sector: 'holding',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 12.5, pbr: 0.65, psr: 0.55,
      roe: 5.5, roa: 2.2, operatingMargin: 8.5, netProfitMargin: 5.5,
      revenueGrowth: 5.5, earningsGrowth: 8.2,
      debtRatio: 125, currentRatio: 95,
      dividendYield: 2.5, payoutRatio: 28,
      beta: 1.0, marketCap: 120000, // 12조
    },
    updatedAt: '2024-12-16',
  },
  {
    symbol: '003550',
    name: 'LG',
    nameEn: 'LG Corp',
    sector: 'holding',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 10.5, pbr: 0.55, psr: 2.5,
      roe: 5.8, roa: 3.5, operatingMargin: 75.5, netProfitMargin: 55.5,
      revenueGrowth: 2.5, earningsGrowth: 5.2,
      debtRatio: 15, currentRatio: 285,
      dividendYield: 3.2, payoutRatio: 32,
      beta: 0.85, marketCap: 135000, // 13.5조
    },
    updatedAt: '2024-12-16',
  },
  
  // === 유통 ===
  {
    symbol: '004170',
    name: '신세계',
    nameEn: 'Shinsegae',
    sector: 'retail',
    market: 'KOSPI',
    isKospi200: true,
    financials: {
      per: 15.5, pbr: 0.45, psr: 0.25,
      roe: 3.2, roa: 1.5, operatingMargin: 3.5, netProfitMargin: 2.2,
      revenueGrowth: 5.5, earningsGrowth: 15.2,
      debtRatio: 85, currentRatio: 75,
      dividendYield: 1.8, payoutRatio: 25,
      beta: 0.92, marketCap: 25000, // 2.5조
    },
    updatedAt: '2024-12-16',
  },
];

/**
 * 심볼로 종목 마스터 데이터 조회
 */
export function getStockMaster(symbol: string): StockMaster | undefined {
  return STOCK_MASTER.find(s => s.symbol === symbol);
}

/**
 * 섹터로 종목 목록 조회
 */
export function getStocksBySector(sector: Sector): StockMaster[] {
  return STOCK_MASTER.filter(s => s.sector === sector);
}

/**
 * 코스피200 종목만 조회
 */
export function getKospi200Stocks(): StockMaster[] {
  return STOCK_MASTER.filter(s => s.isKospi200);
}

/**
 * 전체 종목 심볼 목록
 */
export function getAllSymbols(): string[] {
  return STOCK_MASTER.map(s => s.symbol);
}

