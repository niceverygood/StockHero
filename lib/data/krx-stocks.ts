/**
 * KRX 상장종목 데이터
 * KOSPI + KOSDAQ 주요 종목 목록
 * 
 * 데이터 출처: 한국거래소 (KRX)
 * 업데이트: 2024년 12월
 */

export interface KRXStock {
  symbol: string;      // 종목코드 (6자리)
  name: string;        // 종목명
  market: 'KOSPI' | 'KOSDAQ';  // 시장구분
  sector: string;      // 업종
}

// KOSPI 대표 종목
const KOSPI_STOCKS: KRXStock[] = [
  // 반도체/전자
  { symbol: '005930', name: '삼성전자', market: 'KOSPI', sector: '반도체' },
  { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '반도체' },
  { symbol: '066570', name: 'LG전자', market: 'KOSPI', sector: '전자' },
  { symbol: '009150', name: '삼성전기', market: 'KOSPI', sector: '전자부품' },
  { symbol: '006400', name: '삼성SDI', market: 'KOSPI', sector: '2차전지' },
  
  // 2차전지/에너지
  { symbol: '373220', name: 'LG에너지솔루션', market: 'KOSPI', sector: '2차전지' },
  { symbol: '051910', name: 'LG화학', market: 'KOSPI', sector: '화학' },
  { symbol: '096770', name: 'SK이노베이션', market: 'KOSPI', sector: '정유' },
  
  // 바이오/제약
  { symbol: '207940', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  { symbol: '068270', name: '셀트리온', market: 'KOSPI', sector: '바이오' },
  { symbol: '128940', name: '한미약품', market: 'KOSPI', sector: '제약' },
  { symbol: '000100', name: '유한양행', market: 'KOSPI', sector: '제약' },
  { symbol: '145720', name: '덴티움', market: 'KOSPI', sector: '의료기기' },
  
  // 자동차/운송
  { symbol: '005380', name: '현대차', market: 'KOSPI', sector: '자동차' },
  { symbol: '000270', name: '기아', market: 'KOSPI', sector: '자동차' },
  { symbol: '012330', name: '현대모비스', market: 'KOSPI', sector: '자동차부품' },
  { symbol: '018880', name: '한온시스템', market: 'KOSPI', sector: '자동차부품' },
  { symbol: '161390', name: '한국타이어앤테크놀로지', market: 'KOSPI', sector: '타이어' },
  
  // IT/플랫폼
  { symbol: '035420', name: 'NAVER', market: 'KOSPI', sector: 'IT서비스' },
  { symbol: '035720', name: '카카오', market: 'KOSPI', sector: 'IT서비스' },
  { symbol: '036570', name: '엔씨소프트', market: 'KOSPI', sector: '게임' },
  { symbol: '251270', name: '넷마블', market: 'KOSPI', sector: '게임' },
  { symbol: '263750', name: '펄어비스', market: 'KOSPI', sector: '게임' },
  
  // 금융
  { symbol: '105560', name: 'KB금융', market: 'KOSPI', sector: '금융' },
  { symbol: '055550', name: '신한지주', market: 'KOSPI', sector: '금융' },
  { symbol: '086790', name: '하나금융지주', market: 'KOSPI', sector: '금융' },
  { symbol: '316140', name: '우리금융지주', market: 'KOSPI', sector: '금융' },
  { symbol: '024110', name: '기업은행', market: 'KOSPI', sector: '금융' },
  { symbol: '032830', name: '삼성생명', market: 'KOSPI', sector: '보험' },
  { symbol: '000810', name: '삼성화재', market: 'KOSPI', sector: '보험' },
  { symbol: '003690', name: '코리안리', market: 'KOSPI', sector: '보험' },
  { symbol: '138930', name: 'BNK금융지주', market: 'KOSPI', sector: '금융' },
  { symbol: '139130', name: 'DGB금융지주', market: 'KOSPI', sector: '금융' },
  { symbol: '175330', name: 'JB금융지주', market: 'KOSPI', sector: '금융' },
  
  // 통신
  { symbol: '017670', name: 'SK텔레콤', market: 'KOSPI', sector: '통신' },
  { symbol: '030200', name: 'KT', market: 'KOSPI', sector: '통신' },
  { symbol: '032640', name: 'LG유플러스', market: 'KOSPI', sector: '통신' },
  
  // 철강/소재
  { symbol: '005490', name: 'POSCO홀딩스', market: 'KOSPI', sector: '철강' },
  { symbol: '004020', name: '현대제철', market: 'KOSPI', sector: '철강' },
  { symbol: '001230', name: '동국제강', market: 'KOSPI', sector: '철강' },
  { symbol: '042670', name: '두산인프라코어', market: 'KOSPI', sector: '기계' },
  
  // 건설/부동산
  { symbol: '000720', name: '현대건설', market: 'KOSPI', sector: '건설' },
  { symbol: '047040', name: '대우건설', market: 'KOSPI', sector: '건설' },
  { symbol: '006360', name: 'GS건설', market: 'KOSPI', sector: '건설' },
  { symbol: '034730', name: 'SK', market: 'KOSPI', sector: '지주' },
  { symbol: '003550', name: 'LG', market: 'KOSPI', sector: '지주' },
  { symbol: '028260', name: '삼성물산', market: 'KOSPI', sector: '지주' },
  
  // 유통/소비재
  { symbol: '004170', name: '신세계', market: 'KOSPI', sector: '유통' },
  { symbol: '139480', name: '이마트', market: 'KOSPI', sector: '유통' },
  { symbol: '069960', name: '현대백화점', market: 'KOSPI', sector: '유통' },
  { symbol: '051600', name: '한전KPS', market: 'KOSPI', sector: '전력' },
  { symbol: '015760', name: '한국전력', market: 'KOSPI', sector: '전력' },
  
  // 식품/음료
  { symbol: '097950', name: 'CJ제일제당', market: 'KOSPI', sector: '식품' },
  { symbol: '051900', name: 'LG생활건강', market: 'KOSPI', sector: '화장품' },
  { symbol: '090430', name: '아모레퍼시픽', market: 'KOSPI', sector: '화장품' },
  { symbol: '004990', name: '롯데지주', market: 'KOSPI', sector: '지주' },
  { symbol: '271560', name: '오리온', market: 'KOSPI', sector: '식품' },
  
  // 조선/중공업
  { symbol: '009540', name: '한국조선해양', market: 'KOSPI', sector: '조선' },
  { symbol: '010140', name: '삼성중공업', market: 'KOSPI', sector: '조선' },
  { symbol: '042660', name: '한화오션', market: 'KOSPI', sector: '조선' },
  { symbol: '329180', name: 'HD현대중공업', market: 'KOSPI', sector: '조선' },
  
  // 항공/운송
  { symbol: '003490', name: '대한항공', market: 'KOSPI', sector: '항공' },
  { symbol: '020560', name: '아시아나항공', market: 'KOSPI', sector: '항공' },
  { symbol: '180640', name: '한진칼', market: 'KOSPI', sector: '지주' },
  
  // 방산
  { symbol: '012450', name: '한화에어로스페이스', market: 'KOSPI', sector: '방산' },
  { symbol: '047810', name: '한국항공우주', market: 'KOSPI', sector: '방산' },
  { symbol: '298050', name: 'LIG넥스원', market: 'KOSPI', sector: '방산' },
  
  // 엔터/미디어
  { symbol: '352820', name: '하이브', market: 'KOSPI', sector: '엔터' },
  { symbol: '122870', name: 'YG엔터테인먼트', market: 'KOSPI', sector: '엔터' },
  { symbol: '041510', name: 'SM', market: 'KOSPI', sector: '엔터' },
  { symbol: '079160', name: 'CJ CGV', market: 'KOSPI', sector: '미디어' },
  
  // 기타
  { symbol: '011170', name: '롯데케미칼', market: 'KOSPI', sector: '화학' },
  { symbol: '011790', name: 'SKC', market: 'KOSPI', sector: '화학' },
  { symbol: '010130', name: '고려아연', market: 'KOSPI', sector: '비철금속' },
  { symbol: '010950', name: 'S-Oil', market: 'KOSPI', sector: '정유' },
  { symbol: '267250', name: 'HD현대', market: 'KOSPI', sector: '지주' },
];

// KOSDAQ 대표 종목
const KOSDAQ_STOCKS: KRXStock[] = [
  // 2차전지/소재
  { symbol: '247540', name: '에코프로비엠', market: 'KOSDAQ', sector: '2차전지' },
  { symbol: '086520', name: '에코프로', market: 'KOSDAQ', sector: '2차전지' },
  { symbol: '003670', name: '포스코퓨처엠', market: 'KOSDAQ', sector: '2차전지' },
  { symbol: '006260', name: 'LS', market: 'KOSDAQ', sector: '전기장비' },
  { symbol: '112610', name: '씨에스윈드', market: 'KOSDAQ', sector: '풍력' },
  
  // 바이오/제약
  { symbol: '091990', name: '셀트리온헬스케어', market: 'KOSDAQ', sector: '바이오' },
  { symbol: '141080', name: '레고켐바이오', market: 'KOSDAQ', sector: '바이오' },
  { symbol: '196170', name: '알테오젠', market: 'KOSDAQ', sector: '바이오' },
  { symbol: '145020', name: '휴젤', market: 'KOSDAQ', sector: '바이오' },
  { symbol: '328130', name: '루닛', market: 'KOSDAQ', sector: '바이오' },
  { symbol: '326030', name: 'SK바이오팜', market: 'KOSDAQ', sector: '바이오' },
  { symbol: '950130', name: '엑세스바이오', market: 'KOSDAQ', sector: '바이오' },
  { symbol: '137310', name: '에스디바이오센서', market: 'KOSDAQ', sector: '바이오' },
  
  // IT/반도체
  { symbol: '058470', name: '리노공업', market: 'KOSDAQ', sector: '반도체' },
  { symbol: '226330', name: '신테카바이오', market: 'KOSDAQ', sector: 'IT' },
  { symbol: '293490', name: '카카오게임즈', market: 'KOSDAQ', sector: '게임' },
  { symbol: '357780', name: '솔브레인', market: 'KOSDAQ', sector: '반도체소재' },
  { symbol: '035760', name: 'CJ ENM', market: 'KOSDAQ', sector: '미디어' },
  { symbol: '067160', name: '아프리카TV', market: 'KOSDAQ', sector: 'IT서비스' },
  { symbol: '053800', name: '안랩', market: 'KOSDAQ', sector: '소프트웨어' },
  
  // 엔터/콘텐츠
  { symbol: '261720', name: '엘앤에프', market: 'KOSDAQ', sector: '2차전지' },
  { symbol: '041920', name: '메디아나', market: 'KOSDAQ', sector: '의료기기' },
  { symbol: '095340', name: 'ISC', market: 'KOSDAQ', sector: '반도체' },
  { symbol: '240810', name: '원익IPS', market: 'KOSDAQ', sector: '반도체장비' },
  { symbol: '036540', name: 'SFA반도체', market: 'KOSDAQ', sector: '반도체' },
  
  // 소재/화학
  { symbol: '117580', name: '대성에너지', market: 'KOSDAQ', sector: '에너지' },
  { symbol: '900310', name: '컬러레이', market: 'KOSDAQ', sector: '소재' },
  
  // 기계/장비
  { symbol: '214150', name: '클래시스', market: 'KOSDAQ', sector: '의료기기' },
  { symbol: '039030', name: '이오테크닉스', market: 'KOSDAQ', sector: '반도체장비' },
  { symbol: '078600', name: '대주전자재료', market: 'KOSDAQ', sector: '전자소재' },
  { symbol: '222080', name: '씨아이에스', market: 'KOSDAQ', sector: '2차전지장비' },
  
  // 화장품/소비재  
  { symbol: '192820', name: '코스맥스', market: 'KOSDAQ', sector: '화장품' },
  { symbol: '950140', name: '잇츠한불', market: 'KOSDAQ', sector: '화장품' },
  
  // AI/로봇
  { symbol: '454910', name: '펀진', market: 'KOSDAQ', sector: 'AI' },
  { symbol: '455900', name: '마이크로디지탈', market: 'KOSDAQ', sector: 'AI' },
  { symbol: '348150', name: '레인보우로보틱스', market: 'KOSDAQ', sector: '로봇' },
  { symbol: '272210', name: '한화시스템', market: 'KOSDAQ', sector: '방산' },
  
  // 기타
  { symbol: '131970', name: '두산테스나', market: 'KOSDAQ', sector: '반도체' },
  { symbol: '294870', name: '큐렉소', market: 'KOSDAQ', sector: '의료로봇' },
  { symbol: '041190', name: '우리기술투자', market: 'KOSDAQ', sector: '금융' },
  { symbol: '377300', name: '카카오페이', market: 'KOSDAQ', sector: '핀테크' },
  { symbol: '033640', name: '네패스', market: 'KOSDAQ', sector: '반도체' },
  { symbol: '034220', name: 'LG디스플레이', market: 'KOSDAQ', sector: '디스플레이' },
];

// 전체 종목 리스트
export const KRX_ALL_STOCKS: KRXStock[] = [...KOSPI_STOCKS, ...KOSDAQ_STOCKS];

// 섹터 목록
export const KRX_SECTORS = Array.from(new Set(KRX_ALL_STOCKS.map(s => s.sector))).sort();

// 종목 코드로 검색
export function findStockBySymbol(symbol: string): KRXStock | undefined {
  return KRX_ALL_STOCKS.find(s => s.symbol === symbol);
}

// 종목명으로 검색 (부분 일치)
export function searchStocksByName(query: string): KRXStock[] {
  const lowerQuery = query.toLowerCase();
  return KRX_ALL_STOCKS.filter(s => 
    s.name.toLowerCase().includes(lowerQuery) ||
    s.symbol.includes(query)
  );
}

// 섹터별 종목 조회
export function getStocksBySector(sector: string): KRXStock[] {
  return KRX_ALL_STOCKS.filter(s => s.sector === sector);
}

// 시장별 종목 조회
export function getStocksByMarket(market: 'KOSPI' | 'KOSDAQ'): KRXStock[] {
  return KRX_ALL_STOCKS.filter(s => s.market === market);
}

// 종목 코드 유효성 검사
export function isValidStockSymbol(symbol: string): boolean {
  return /^\d{6}$/.test(symbol);
}

