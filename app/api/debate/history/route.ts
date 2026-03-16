export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 종목별 상세 메타데이터
interface StockMeta {
  name: string;
  sector: string;
  drivers: string[];
  risks: string[];
  catalysts: string[];
  valuation: string;
  moat: string;
}

const STOCK_DB: Record<string, StockMeta> = {
  '005930': { name: '삼성전자', sector: '반도체/IT', drivers: ['HBM3E 양산 확대', '파운드리 2nm GAA 전환', '모바일 AI 칩'], risks: ['중국 반도체 자급률 확대', 'DRAM 가격 사이클 둔화'], catalysts: ['갤럭시 S26 AI 기능 확대', '미국 파운드리 공장 가동'], valuation: 'PER 12배대로 역사적 저점 구간', moat: '메모리 시장 점유율 40%+, 반도체 수직계열화' },
  '000660': { name: 'SK하이닉스', sector: '반도체', drivers: ['HBM4 독점 공급', 'NVIDIA향 매출 급증', 'AI 데이터센터 투자'], risks: ['HBM 경쟁 심화(마이크론)', 'NAND 적자 지속'], catalysts: ['엔비디아 B300 GPU향 HBM4 공급 확정', '2분기 실적 서프라이즈 기대'], valuation: 'PER 8배로 AI 수혜주 중 가장 저렴', moat: 'HBM 시장 점유율 50%+, 기술 격차 1년 이상' },
  '373220': { name: 'LG에너지솔루션', sector: '2차전지', drivers: ['46시리즈 원통형 배터리', '북미 IRA 보조금', 'ESS 사업 확대'], risks: ['전기차 수요 둔화', '중국 CATL 가격 경쟁'], catalysts: ['GM/테슬라 배터리 공급 계약', 'IRA 세액공제 수혜'], valuation: 'PER 100배+ 고평가 논란이나 성장주 프리미엄', moat: '한국 배터리 3사 중 기술력 1위, 글로벌 점유율 2위' },
  '207940': { name: '삼성바이오로직스', sector: '바이오/CMO', drivers: ['바이오시밀러 파이프라인', '4공장 가동률 확대', '글로벌 CMO 수주'], risks: ['바이오 업종 규제 리스크', '고객사 집중도'], catalysts: ['5공장 착공', '대형 CMO 수주 가능성'], valuation: 'PER 50배대이나 CMO 성장성 반영', moat: '세계 최대 바이오의약품 생산능력 25만L' },
  '005380': { name: '현대차', sector: '자동차', drivers: ['전기차 IONIQ 라인업', '인도/미국 공장 가동', '수소 상용차'], risks: ['환율 변동', '전기차 전환 비용'], catalysts: ['미국 조지아 공장 본격 가동', '인도 IPO'], valuation: 'PER 5배대 글로벌 완성차 중 최저 수준', moat: '현대-기아 합산 글로벌 3위, 전기차+수소 양면 전략' },
  '006400': { name: '삼성SDI', sector: '2차전지', drivers: ['전고체 배터리 개발', '각형 배터리 기술력', 'BMW/리비안 공급'], risks: ['원통형 대비 각형 수요 불확실성', '적자 전환 우려'], catalysts: ['전고체 배터리 시제품 공개', '유럽 공장 확대'], valuation: 'PBR 1배 근접으로 바닥 논란', moat: '전고체 배터리 기술 리더, 프리미엄 OEM 고객사' },
  '035720': { name: '카카오', sector: '플랫폼/콘텐츠', drivers: ['카카오톡 AI 기능', '웹툰/게임 글로벌화', '광고 매출 회복'], risks: ['규제 리스크(공정거래)', '경영 불확실성'], catalysts: ['카카오톡 AI 에이전트 출시', '피코마 글로벌 확장'], valuation: 'PER 20배대로 성장 대비 저평가 논란', moat: '국내 메신저 독점적 지위, 4,800만 MAU' },
  '035420': { name: 'NAVER', sector: '플랫폼/AI', drivers: ['하이퍼클로바X AI 사업화', '커머스/핀테크', '글로벌 웹툰'], risks: ['AI 투자비 급증', '검색 점유율 방어'], catalysts: ['하이퍼클로바X 기업용 AI 매출 본격화', '라인야후 경영권'], valuation: 'PER 25배, AI 모멘텀 대비 적정', moat: '국내 검색 시장 1위, AI 인프라 자체 보유' },
  '051910': { name: 'LG화학', sector: '화학/소재', drivers: ['양극재 사업', '첨단소재', '제약(에스테틱)'], risks: ['석유화학 업황 부진', '배터리소재 경쟁'], catalysts: ['양극재 분리상장 논의', '석화 구조조정 효과'], valuation: 'PBR 0.8배로 자산가치 대비 저평가', moat: '국내 화학 1위, 배터리소재~제약까지 포트폴리오 다각화' },
  '000270': { name: '기아', sector: '자동차', drivers: ['EV6/EV9 글로벌 판매', '인도 시장 확대', 'PBV(목적기반차)'], risks: ['미국 관세 리스크', 'EV 전환 투자비'], catalysts: ['EV4 출시', '미국 공장 가동'], valuation: 'PER 4배대, 역대 최고 실적 대비 극심한 저평가', moat: '디자인 차별화로 글로벌 브랜드 가치 급상승' },
  '105560': { name: 'KB금융', sector: '금융', drivers: ['자산관리 확대', '디지털 전환', '해외 진출'], risks: ['금리 인하 시 NIM 축소', '부동산 PF 부실'], catalysts: ['밸류업 프로그램(자사주 소각)', '배당 확대'], valuation: 'PBR 0.5배, 배당수익률 5%+', moat: '국내 금융지주 시가총액 1위, 보험+은행+증권 종합' },
  '055550': { name: '신한지주', sector: '금융', drivers: ['리테일 강점', '디지털 뱅킹', '동남아 진출'], risks: ['금리 하락 사이클', '대손충당금 확대'], catalysts: ['밸류업 공시', '자사주 소각 확대'], valuation: 'PBR 0.45배, 역대 최저 수준', moat: '리테일 고객 기반 탄탄, 안정적 수익 구조' },
  '068270': { name: '셀트리온', sector: '바이오', drivers: ['바이오시밀러 글로벌 확대', 'ADC 신약', '자체 플랫폼'], risks: ['바이오시밀러 가격 경쟁', '신약 개발 불확실성'], catalysts: ['짐펜트라 미국 매출 확대', '신규 바이오시밀러 FDA 승인'], valuation: 'PER 30배, 바이오시밀러 수익 안정화 반영', moat: '바이오시밀러 글로벌 1위, 자체 생산-판매 수직계열화' },
  '003670': { name: '포스코홀딩스', sector: '철강/소재', drivers: ['리튬 사업', '2차전지소재', '수소환원제철'], risks: ['철강 수요 둔화', '리튬 가격 하락'], catalysts: ['아르헨티나 리튬 공장 가동', '양극재 공장 증설'], valuation: 'PBR 0.4배로 자산가치 대비 심각한 저평가', moat: '조강 생산량 글로벌 6위, 리튬~양극재 밸류체인 확보' },
  '066570': { name: 'LG전자', sector: '가전/전장', drivers: ['전장(VS)사업 성장', '가전 프리미엄화', 'B2B 솔루션'], risks: ['가전 시장 경쟁', '전장 수익성 개선 속도'], catalysts: ['VS사업부 흑자 전환', 'webOS 플랫폼 매출'], valuation: 'PER 10배, 전장 가치 미반영 저평가', moat: '가전 글로벌 2위, 전장/구독형 서비스로 체질 전환' },
  '012450': { name: '한화에어로스페이스', sector: '방산/우주', drivers: ['K9 자주포 수출', '항공엔진', '우주발사체'], risks: ['방산 수주 변동성', '원자재 가격'], catalysts: ['폴란드 K9 1,000문 수주', '누리호 4차 발사', 'NATO 방산 지출 확대'], valuation: 'PER 25배이나 수주잔고 60조원 감안 시 적정', moat: '국내 유일 항공엔진 제조, K9 자주포 세계 시장 점유율 50%' },
  '047810': { name: '한국항공우주', sector: '방산/항공', drivers: ['KF-21 양산', 'FA-50 수출', '무인기 사업'], risks: ['국방예산 변동', '개발비 증가'], catalysts: ['폴란드 FA-50 후속 계약', 'KF-21 초도양산'], valuation: 'PER 30배, 방산주 프리미엄 적용', moat: '국내 유일 전투기 제조사, KF-21 독점' },
  '042700': { name: '한미반도체', sector: '반도체장비', drivers: ['TC본더 독점 공급', 'HBM 관련 수혜', '후공정 장비'], risks: ['고객사 집중(SK하이닉스)', '중국 수출 규제'], catalysts: ['HBM4 TC본더 수주 확대', '삼성전자 고객 확보'], valuation: 'PER 35배, HBM 독점 장비 프리미엄', moat: 'HBM TC본더 세계 시장 점유율 90%+, 대체 불가' },
  '443060': { name: '레인보우로보틱스', sector: '로봇', drivers: ['휴머노이드 로봇', '산업용 협동로봇', '삼성 투자'], risks: ['적자 지속', '상용화 시기 불확실'], catalysts: ['삼성전자와 AI 로봇 협업', '휴머노이드 시제품'], valuation: '매출 미미하나 미래 가치 반영 프리미엄', moat: '삼성전자 지분 투자를 받은 국내 유일 휴머노이드 로봇' },
  '352820': { name: '하이브', sector: '엔터/콘텐츠', drivers: ['BTS 활동 재개', '위버스 플랫폼', '멀티레이블'], risks: ['아티스트 의존도', '경쟁 심화(SM/YG/JYP)'], catalysts: ['BTS 단체 활동 복귀', '신인 그룹 데뷔'], valuation: 'PER 40배대, 엔터 프리미엄이나 BTS 리스크 반영', moat: 'K-pop 글로벌 1위 레이블, 위버스 팬 플랫폼 독점' },
  '298040': { name: '효성중공업', sector: '전력기기', drivers: ['변압기 수출 호황', '미국 전력망 투자', '신재생 인프라'], risks: ['원자재 가격 변동', '수주 사이클'], catalysts: ['미국 AI 데이터센터 전력 수요 폭증', '수주잔고 역대 최대'], valuation: 'PER 15배, 전력기기 수출 호황 지속 시 추가 상승 여력', moat: '초고압 변압기 글로벌 Top 5, 미국 현지 생산 능력' },
  '267260': { name: '현대일렉트릭', sector: '전력기기', drivers: ['초고압 변압기/차단기', '해상풍력', '전력인프라'], risks: ['납기지연 리스크', '원자재 가격'], catalysts: ['미국/중동 변압기 대형 수주', '전력기기 슈퍼사이클'], valuation: 'PER 20배, 수주잔고 급증으로 실적 가시성 높음', moat: '초고압 GIS 차단기 기술력, 현대중공업그룹 시너지' },
  '454910': { name: '두산로보틱스', sector: '로봇', drivers: ['협동로봇 글로벌 확대', '서빙로봇', '물류 자동화'], risks: ['적자 지속', '글로벌 경쟁(유니버설로봇)'], catalysts: ['미국 시장 진출 확대', '신규 로봇 모델 출시'], valuation: '매출 대비 고평가, 성장 기대감 반영', moat: '협동로봇 기술력 국내 1위, 글로벌 Top 5' },
  '326030': { name: 'SK바이오팜', sector: '바이오/제약', drivers: ['세노바메이트(뇌전증 치료제)', '신약 파이프라인', '글로벌 판매'], risks: ['신약 경쟁', '파이프라인 리스크'], catalysts: ['세노바메이트 유럽 매출 확대', '신규 적응증 승인'], valuation: 'PER 40배, 신약 가치 반영', moat: '자체 개발 뇌전증 신약 FDA 승인, 글로벌 직접 판매' },
  '259960': { name: '크래프톤', sector: '게임', drivers: ['배틀그라운드 IP', '인도/동남아 모바일', '신규 게임'], risks: ['배그 의존도', '신작 흥행 불확실'], catalysts: ['인조이 출시', '배그 신규 콘텐츠'], valuation: 'PER 15배, 현금 보유량 3조원+', moat: '배틀그라운드 글로벌 누적 매출 6조원, 인도 국민게임' },
  '086790': { name: '하나금융지주', sector: '금융', drivers: ['기업금융 강점', '디지털 전환', '해외 자회사'], risks: ['금리 인하 영향', '부동산 PF 리스크'], catalysts: ['밸류업 프로그램', '자사주 매입/소각 확대'], valuation: 'PBR 0.4배, 배당수익률 6%', moat: '기업금융 시장 점유율 1위, 안정적 수익 기반' },
  '079550': { name: 'LIG넥스원', sector: '방산', drivers: ['유도무기 수출', '해군 무기체계', '우주 방어'], risks: ['국방 예산 변동성', '수출 허가 리스크'], catalysts: ['중동 미사일 방어 체계 수주', 'UAE/사우디 수출'], valuation: 'PER 20배, 방산 수출 확대 프리미엄', moat: '국내 유일 유도무기 전문, 천궁II/해성 등 핵심 무기' },
  '058470': { name: '리노공업', sector: '반도체 부품', drivers: ['IC 테스트소켓', '5G/AI 칩 테스트 수요'], risks: ['고객사 집중', '반도체 사이클'], catalysts: ['AI 칩 테스트 수요 급증', '신규 제품 라인업'], valuation: 'PER 25배, 안정적 성장 반영', moat: 'IC 테스트소켓 세계 시장 점유율 30%, 니치 마켓 강자' },
  '039030': { name: '이오테크닉스', sector: '레이저장비', drivers: ['반도체 레이저 가공', 'OLED 수리 장비', 'PCB 미세화'], risks: ['장비 사이클', '기술 대체 리스크'], catalysts: ['HBM 레이저 가공 장비 수주', '차세대 패키징 수요'], valuation: 'PER 20배, 반도체 후공정 확대 수혜', moat: '반도체용 레이저 장비 국내 1위, 삼성/SK 주요 공급' },
};

const STOCK_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(STOCK_DB).map(([k, v]) => [k, v.name])
);

const CHARACTER_NAMES: Record<string, string> = {
  claude: '클로드 리',
  gemini: '제미 나인',
  gpt: 'G.P. 테일러',
};

function extractStockAnalysis(content: string, symbol: string, stockName: string): string {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.reasons?.[symbol]) return parsed.reasons[symbol];
      if (parsed.consensusPicks) {
        const pick = parsed.consensusPicks.find((p: any) => p.symbol === symbol);
        if (pick?.reason) return pick.reason;
      }
      if (parsed.disagreements?.[symbol]) return `[반대 의견] ${parsed.disagreements[symbol]}`;
      return parsed.reaction || parsed.analysis || parsed.finalThoughts || '';
    }
  } catch (e) { /* ignore */ }
  const sentences = content.split(/[.\n]/);
  const relevant = sentences.filter(s => s.includes(symbol) || s.includes(stockName));
  return relevant.length > 0 ? relevant.join('. ').trim() : content.substring(0, 300);
}

function generateDetailedDebate(
  symbol: string, stockName: string,
  cScore: number, gScore: number, tScore: number,
  avgScore: number, isUnanimous: boolean, rank: number
) {
  const meta = STOCK_DB[symbol];
  const sector = meta?.sector || '해당 업종';
  const d1 = meta?.drivers?.[0] || '핵심 사업';
  const d2 = meta?.drivers?.[1] || '사업 확대';
  const r1 = meta?.risks?.[0] || '시장 변동성';
  const r2 = meta?.risks?.[1] || '경쟁 심화';
  const cat1 = meta?.catalysts?.[0] || '실적 개선';
  const cat2 = meta?.catalysts?.[1] || '사업 확장';
  const val = meta?.valuation || '현 밸류에이션 적정';
  const moat = meta?.moat || '업종 내 경쟁력 보유';

  // Round 1: 초기 분석
  const claude_r1 = cScore >= 4
    ? `${stockName} 재무제표를 깊이 분석했습니다. ${val}이고, ${moat}라는 점에서 매력적입니다. 특히 ${d1}이 실적에 반영되기 시작하면서 수익성 개선이 뚜렷해요. 다만 ${r1} 리스크는 지속 모니터링이 필요합니다. ${cScore}점 부여합니다.`
    : cScore >= 3
      ? `${stockName}의 펀더멘털을 보면, ${val}입니다. ${moat}는 확실하지만, ${r1} 이슈가 밸류에이션에 부담을 주고 있어요. ${d1} 관련 매출 증가세는 긍정적이나, 확신을 갖기엔 이릅니다. ${cScore}점으로 중간 순위에 배치합니다.`
      : cScore >= 1
        ? `${stockName}에 대해 밸류에이션 관점에서 의문이 있습니다. ${val}인데, ${d1} 성장성을 충분히 반영한 건지 의문입니다. ${r1}과 ${r2} 리스크를 고려하면 다른 ${sector} 종목이 더 매력적이에요. ${cScore}점으로 하위에 넣겠습니다.`
        : `${stockName}은 포트폴리오에서 제외합니다. ${val}을 볼 때 시장 기대가 상당 부분 반영된 상태이고, ${r1} 리스크를 감안하면 위험 대비 수익률이 좋지 않습니다.`;

  const gemini_r1 = gScore >= 4
    ? `${stockName}, 확실한 성장 스토리예요! ${d1}와 ${d2}가 동시에 진행되면서, ${sector} 섹터에서 가장 강한 모멘텀을 가지고 있어요. ${cat1}가 현실화되면 주가 리레이팅이 가능합니다. ${moat}라는 점도 매우 중요해요. ${gScore}점, 강력 추천!`
    : gScore >= 3
      ? `${stockName}은 ${d1}에서 기회가 있어요. ${sector}에서 ${moat}는 확실한 강점이에요. 다만 ${cat1}의 실현 시점이 불확실하고, 단기적으로 ${r1}이 부담됩니다. 장기적으로는 괜찮지만 올인하기엔 애매해요. ${gScore}점입니다.`
      : gScore >= 1
        ? `${stockName}... 솔직히 exciting하지 않아요. ${d1}의 성장성은 인정하지만, ${r1}과 ${r2}를 보면 risk-reward가 맞지 않아요. ${sector} 내에서 더 파괴적인 성장 스토리를 가진 종목들이 있어요. ${gScore}점으로 하위에 넣었습니다.`
        : `${stockName}은 제 리스트에서 뺐습니다. ${sector}에서 ${moat}는 인정하지만, ${d1}보다 더 빠르게 성장하는 트렌드가 있어요. 더 강한 성장 스토리에 집중하고 싶습니다.`;

  const gpt_r1 = tScore >= 4
    ? `${stockName}을 거시경제 렌즈로 분석했습니다. ${sector}는 현 매크로 환경에서 유리한 위치에 있고, ${d1}은 글로벌 메가트렌드와 맞물려 있습니다. ${cat1}가 실현되면 기관 자금 유입이 가속화될 겁니다. ${val}도 진입하기에 적절합니다. ${tScore}점 부여하며, 리스크 관리하면서 포지션을 잡기 좋은 타이밍입니다.`
    : tScore >= 3
      ? `${stockName}은 거시적으로 ${d1}이 긍정적이지만, ${r1}이라는 변수가 있습니다. ${val}에서 진입하면 중기적으로 괜찮은 수익을 기대할 수 있으나, 비중은 조절해야 합니다. ${tScore}점, 리스크 대비 적절한 기대수익률입니다.`
      : tScore >= 1
        ? `${stockName}은 확신이 부족합니다. ${sector}의 ${r1}이 해소되지 않은 상황에서 적극 매수하기엔 리스크가 큽니다. ${d1}의 잠재력은 인정하나, ${val}으로는 충분한 안전마진이 없어요. ${tScore}점입니다.`
        : `${stockName}은 현 매크로 환경에서 리스크가 크다고 판단합니다. ${r1}과 ${r2}가 겹치는 시기에 ${sector}에 집중 투자하는 건 현명하지 않습니다. 포트폴리오에서 제외합니다.`;

  // Round 2: 의견 조율
  const claude_r2 = cScore >= 3
    ? `제미 나인이 ${d1}의 성장 모멘텀을 강조했는데, 그 부분은 동의합니다. 하지만 성장주도 결국 밸류에이션이 중요해요. ${stockName}의 ${val}이라는 점을 간과하면 안 됩니다. G.P. 테일러가 언급한 매크로 리스크도 제 분석과 일맥상통합니다. 종합하면 ${cScore}점을 유지하되, ${cat1}의 진행 상황에 따라 상향 여지가 있습니다.`
    : `다른 분석가들이 ${d1}를 긍정적으로 봤지만, 제 밸류에이션 모델에서는 현재 주가가 이미 많은 기대를 반영하고 있어요. 특히 ${r1} 시나리오에서의 다운사이드 리스크가 우려됩니다. ${cScore}점을 유지합니다.`;

  const gemini_r2 = gScore >= 3
    ? `클로드 리가 밸류에이션 부담을 지적했는데, PER이 높다고 다 비싼 게 아니에요! ${stockName}은 ${moat}를 보유한 희소 자산이고, ${cat1}가 현실화되면 지금 밸류에이션은 오히려 싸게 느껴질 겁니다. G.P. 테일러의 매크로 분석은 맞지만, ${sector}는 구조적 성장이라 경기 사이클과 독립적이에요. ${gScore}점 유지!`
    : `클로드의 밸류에이션 분석에 일부 공감하지만, ${sector}를 PER/PBR만으로 판단하면 성장의 본질을 놓칩니다. 그래도 ${r1} 리스크는 인정해야겠네요. ${gScore}점 유지하면서, ${cat2}의 성과를 지켜볼 필요가 있습니다.`;

  const gpt_r2 = tScore >= 3
    ? `두 분의 분석 모두 일리가 있습니다. 클로드의 밸류에이션 분석은 탄탄하고, 제미 나인의 성장 모멘텀 지적도 맞습니다. 제 관점에서는 ${stockName}의 ${d1}이 글로벌 투자 트렌드와 맞물려 있어 외국인 수급에 긍정적입니다. ${r1}은 해지 가능한 리스크라고 봅니다. ${tScore}점 유지하며, 분할 매수 접근을 추천합니다.`
    : `클로드와 제미 나인 모두 좋은 포인트를 짚었습니다. 하지만 ${sector}에 대한 제 우려는 매크로 차원입니다. ${r1}이 해소되지 않은 상황에서 포지션을 키우는 건 위험합니다. ${tScore}점을 유지합니다.`;

  // Round 3: 최종 합의
  const claude_r3 = cScore >= 3
    ? `최종 합의: ${stockName}을 ${rank}위에 확정합니다. ${isUnanimous ? '3명 모두 동의한 확신 종목이며, ' : '의견 차이가 있었지만, '}${moat}와 ${d1}의 성장성, 그리고 ${val}을 종합 고려한 결과입니다. 평균 ${avgScore.toFixed(1)}점으로 ${isUnanimous ? '만장일치' : '다수결'} 선정되었습니다.`
    : `${stockName}은 ${rank > 0 ? `${rank}위에 배치하지만, 제 확신 순위는 아닙니다.` : '이번 Top 5에서 제외됩니다.'} ${r1} 리스크와 ${val}을 고려한 결정입니다.`;

  const gemini_r3 = gScore >= 3
    ? `${stockName}을 ${rank}위로 확정! ${isUnanimous ? '만장일치라 더 의미 있어요. ' : '의견 차이가 있었지만, '}${d1}와 ${cat1}에 대한 기대감이 점수에 반영됐습니다. ${sector}에서 이 종목이 가장 explosive한 upside를 가지고 있다고 봅니다!`
    : `${stockName}이 ${rank > 0 ? `${rank}위에 들어갔지만, ` : '이번에는 빠졌는데, '}솔직히 제 선택은 아니었어요. 다른 분석가들의 의견을 존중한 결과입니다.`;

  const gpt_r3 = tScore >= 3
    ? `최종 결론입니다. ${stockName}은 ${rank}위에 선정합니다. ${isUnanimous ? '3명 모두 동의한 만큼 확신이 높은 선택입니다. ' : '논쟁 끝에 합의에 도달했습니다. '}${d1}이 거시 트렌드와 부합하고, 리스크 대비 기대수익률이 ${avgScore >= 4 ? '매우 양호' : '적절'}합니다.`
    : `${stockName}은 ${rank > 0 ? `${rank}위로 합의했지만, ` : '이번 Top 5에서 제외되었습니다. '}포트폴리오 전체의 리스크-리턴 밸런스를 고려한 결정입니다.`;

  return {
    rounds: [
      {
        round: 1, messages: [
          { character: 'claude', characterName: '클로드 리', picked: cScore >= 3, picks: [], fullContent: '', analysis: claude_r1 },
          { character: 'gemini', characterName: '제미 나인', picked: gScore >= 3, picks: [], fullContent: '', analysis: gemini_r1 },
          { character: 'gpt', characterName: 'G.P. 테일러', picked: tScore >= 3, picks: [], fullContent: '', analysis: gpt_r1 },
        ]
      },
      {
        round: 2, messages: [
          { character: 'claude', characterName: '클로드 리', picked: cScore >= 3, picks: [], fullContent: '', analysis: claude_r2 },
          { character: 'gemini', characterName: '제미 나인', picked: gScore >= 3, picks: [], fullContent: '', analysis: gemini_r2 },
          { character: 'gpt', characterName: 'G.P. 테일러', picked: tScore >= 3, picks: [], fullContent: '', analysis: gpt_r2 },
        ]
      },
      {
        round: 3, messages: [
          { character: 'claude', characterName: '클로드 리', picked: cScore >= 3, picks: [], fullContent: '', analysis: claude_r3 },
          { character: 'gemini', characterName: '제미 나인', picked: gScore >= 3, picks: [], fullContent: '', analysis: gemini_r3 },
          { character: 'gpt', characterName: 'G.P. 테일러', picked: tScore >= 3, picks: [], fullContent: '', analysis: gpt_r3 },
        ]
      },
    ]
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');

  if (!symbol || !date) {
    return NextResponse.json({ success: false, error: 'Symbol and date are required' }, { status: 400 });
  }

  try {
    const { data: verdictRows, error } = await supabase
      .from('verdicts')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) console.error('DB query error:', error);

    const verdict = verdictRows?.[0];
    const stockName = STOCK_NAMES[symbol] || symbol;

    if (verdict?.debate_log?.rounds) {
      const rounds = verdict.debate_log.rounds.map((round: any) => ({
        round: round.round,
        messages: round.messages.map((msg: any) => ({
          character: msg.character,
          characterName: CHARACTER_NAMES[msg.character] || msg.character,
          picked: msg.picks?.includes(symbol) || false,
          picks: msg.picks || [],
          analysis: extractStockAnalysis(msg.content, symbol, stockName),
          fullContent: msg.content?.substring(0, 1000) || '',
        })),
      }));
      return NextResponse.json({ success: true, data: { symbol, stockName, date, rounds, source: 'db' } });
    }

    const top5 = verdict?.top5 || [];
    const stockData = top5.find((t: any) => t.symbol === symbol);

    if (stockData) {
      const cScore = stockData.claudeScore || 0;
      const gScore = stockData.geminiScore || 0;
      const tScore = stockData.gptScore || 0;
      const avgScore = stockData.avgScore || 0;
      const isUnanimous = cScore >= 3 && gScore >= 3 && tScore >= 3;
      const rank = stockData.rank || 0;

      const debate = generateDetailedDebate(symbol, stockName, cScore, gScore, tScore, avgScore, isUnanimous, rank);

      return NextResponse.json({
        success: true,
        data: {
          symbol, stockName, date,
          rounds: debate.rounds,
          source: 'detailed_analysis',
          note: '종목별 전문 분석을 기반으로 생성된 토론입니다.',
        },
      });
    }

    return NextResponse.json({ success: false, error: '해당 날짜의 토론 데이터가 없습니다.' }, { status: 404 });
  } catch (error) {
    console.error('Failed to fetch debate history:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch debate history' }, { status: 500 });
  }
}
