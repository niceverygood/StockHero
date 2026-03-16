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
  thesis: string;      // 핵심 투자논리: 왜 이 종목을 사야 하는가
  whyNow: string;      // 지금 왜 사야 하는가
  drivers: string[];
  risks: string[];
  catalysts: string[];
  valuation: string;
  moat: string;
}

const STOCK_DB: Record<string, StockMeta> = {
  '005930': { name: '삼성전자', sector: '반도체/IT', thesis: 'AI 시대 메모리 수요 폭증의 최대 수혜주. HBM3E/4 양산과 파운드리 GAA 전환이 동시에 진행되면서, AI 반도체 밸류체인 전체를 커버하는 유일한 기업', whyNow: 'PER 12배는 삼성전자 10년 평균 대비 30% 할인된 가격. HBM3E 양산 본격화로 2분기부터 실적 턴어라운드가 예상되는 시점', drivers: ['HBM3E 양산 확대', '파운드리 2nm GAA 전환', '모바일 AI 칩'], risks: ['중국 반도체 자급률 확대', 'DRAM 가격 사이클 둔화'], catalysts: ['갤럭시 S26 AI 기능 확대', '미국 파운드리 공장 가동'], valuation: 'PER 12배대로 역사적 저점 구간', moat: '메모리 시장 점유율 40%+, 반도체 수직계열화' },
  '000660': { name: 'SK하이닉스', sector: '반도체', thesis: 'AI 반도체의 핵심 부품 HBM을 전 세계에서 가장 많이 만드는 회사. 엔비디아 GPU에 들어가는 HBM 칩의 50% 이상을 독점 공급하고 있어, AI 투자가 계속되는 한 실적이 보장되는 구조', whyNow: 'PER 8배는 AI 수혜주 중 가장 저렴. HBM4 양산이 시작되면 매출이 한 단계 더 점프할 수 있는 변곡점', drivers: ['HBM4 독점 공급', 'NVIDIA향 매출 급증', 'AI 데이터센터 투자'], risks: ['HBM 경쟁 심화(마이크론)', 'NAND 적자 지속'], catalysts: ['엔비디아 B300 GPU향 HBM4 공급 확정', '2분기 실적 서프라이즈 기대'], valuation: 'PER 8배로 AI 수혜주 중 가장 저렴', moat: 'HBM 시장 점유율 50%+, 기술 격차 1년 이상' },
  '373220': { name: 'LG에너지솔루션', sector: '2차전지', thesis: '전기차 배터리 시장 글로벌 2위이자, 북미 IRA 보조금의 최대 수혜 기업. 테슬라/GM/현대차 등 주요 완성차에 배터리를 공급하며, ESS 사업까지 확장 중', whyNow: 'IRA 세액공제로 미국 내 배터리 생산 시 건당 보조금 확보. 전기차 둔화 우려가 주가에 이미 반영되어 바닥권 진입', drivers: ['46시리즈 원통형 배터리', '북미 IRA 보조금', 'ESS 사업 확대'], risks: ['전기차 수요 둔화', '중국 CATL 가격 경쟁'], catalysts: ['GM/테슬라 배터리 공급 계약', 'IRA 세액공제 수혜'], valuation: 'PER 100배+ 고평가 논란이나 성장주 프리미엄', moat: '한국 배터리 3사 중 기술력 1위, 글로벌 점유율 2위' },
  '207940': { name: '삼성바이오로직스', sector: '바이오/CMO', thesis: '글로벌 제약사들이 바이오의약품 생산을 맡기는 위탁생산(CMO) 세계 1위. 공장을 계속 증설하면서 "바이오 TSMC"로 성장 중', whyNow: '5공장 착공으로 생산능력이 2배 확대 예정. 글로벌 바이오의약품 시장이 매년 10%+ 성장하면서 CMO 수주가 자연스럽게 늘어나는 구조', drivers: ['바이오시밀러 파이프라인', '4공장 가동률 확대', '글로벌 CMO 수주'], risks: ['바이오 업종 규제 리스크', '고객사 집중도'], catalysts: ['5공장 착공', '대형 CMO 수주 가능성'], valuation: 'PER 50배대이나 CMO 성장성 반영', moat: '세계 최대 바이오의약품 생산능력 25만L' },
  '005380': { name: '현대차', sector: '자동차', thesis: '글로벌 판매량 3위 완성차인데 PER 5배. 전기차(IONIQ)+수소차 양면 전략으로 미래차 전환에 가장 유연한 포지션을 구축한 회사', whyNow: '역대 최고 실적을 갱신하고 있는데도 PER 5배로 도요타(10배)의 절반. 밸류업 프로그램으로 주주환원 강화가 진행 중', drivers: ['전기차 IONIQ 라인업', '인도/미국 공장 가동', '수소 상용차'], risks: ['환율 변동', '전기차 전환 비용'], catalysts: ['미국 조지아 공장 본격 가동', '인도 IPO'], valuation: 'PER 5배대 글로벌 완성차 중 최저 수준', moat: '현대-기아 합산 글로벌 3위, 전기차+수소 양면 전략' },
  '006400': { name: '삼성SDI', sector: '2차전지', thesis: '전고체 배터리 기술 리더. BMW/리비안 등 프리미엄 OEM에 각형 배터리를 공급하며, 차세대 전고체 배터리 상용화에 가장 가까운 기업', whyNow: 'PBR 1배 근접은 역사적 바닥 수준. 전고체 배터리 시제품 공개가 임박해 기술 프리미엄 재평가 가능성', drivers: ['전고체 배터리 개발', '각형 배터리 기술력', 'BMW/리비안 공급'], risks: ['원통형 대비 각형 수요 불확실성', '적자 전환 우려'], catalysts: ['전고체 배터리 시제품 공개', '유럽 공장 확대'], valuation: 'PBR 1배 근접으로 바닥 논란', moat: '전고체 배터리 기술 리더, 프리미엄 OEM 고객사' },
  '035720': { name: '카카오', sector: '플랫폼/콘텐츠', thesis: '국민 메신저 카카오톡(MAU 4,800만)을 기반으로 AI/콘텐츠/핀테크를 확장하는 슈퍼앱. 한국인의 일상을 지배하는 플랫폼', whyNow: '규제 리스크가 주가에 과도하게 반영되어 PER 20배까지 하락. AI 에이전트 출시가 새로운 수익원이 될 수 있는 전환점', drivers: ['카카오톡 AI 기능', '웹툰/게임 글로벌화', '광고 매출 회복'], risks: ['규제 리스크(공정거래)', '경영 불확실성'], catalysts: ['카카오톡 AI 에이전트 출시', '피코마 글로벌 확장'], valuation: 'PER 20배대로 성장 대비 저평가 논란', moat: '국내 메신저 독점적 지위, 4,800만 MAU' },
  '035420': { name: 'NAVER', sector: '플랫폼/AI', thesis: '한국 검색 1위 + 자체 AI(하이퍼클로바X) + 글로벌 웹툰 1위. AI 투자를 자체 수익으로 감당할 수 있는 한국 유일의 AI 빅테크', whyNow: '하이퍼클로바X 기업용 AI가 매출로 전환되기 시작하는 시점. AI 수익화가 입증되면 PER 25배는 저렴해질 수 있음', drivers: ['하이퍼클로바X AI 사업화', '커머스/핀테크', '글로벌 웹툰'], risks: ['AI 투자비 급증', '검색 점유율 방어'], catalysts: ['하이퍼클로바X 기업용 AI 매출 본격화', '라인야후 경영권'], valuation: 'PER 25배, AI 모멘텀 대비 적정', moat: '국내 검색 시장 1위, AI 인프라 자체 보유' },
  '051910': { name: 'LG화학', sector: '화학/소재', thesis: '화학+배터리소재+제약을 아우르는 종합 소재 기업. 양극재 사업이 분리상장되면 숨겨진 가치가 드러날 수 있는 가치주', whyNow: 'PBR 0.8배는 순자산가치보다 낮은 가격. 석유화학 구조조정 효과가 하반기부터 실적에 반영될 전망', drivers: ['양극재 사업', '첨단소재', '제약(에스테틱)'], risks: ['석유화학 업황 부진', '배터리소재 경쟁'], catalysts: ['양극재 분리상장 논의', '석화 구조조정 효과'], valuation: 'PBR 0.8배로 자산가치 대비 저평가', moat: '국내 화학 1위, 배터리소재~제약까지 포트폴리오 다각화' },
  '000270': { name: '기아', sector: '자동차', thesis: '역대 최고 실적을 내고 있는데 PER 4배. EV6/EV9으로 전기차 디자인 혁신을 이끌며 글로벌 브랜드 가치가 폭발적으로 상승 중', whyNow: 'PER 4배는 글로벌 완성차 중 가장 저렴. EV4 출시와 미국 공장 가동이 추가 성장 동력이 될 시점', drivers: ['EV6/EV9 글로벌 판매', '인도 시장 확대', 'PBV(목적기반차)'], risks: ['미국 관세 리스크', 'EV 전환 투자비'], catalysts: ['EV4 출시', '미국 공장 가동'], valuation: 'PER 4배대, 역대 최고 실적 대비 극심한 저평가', moat: '디자인 차별화로 글로벌 브랜드 가치 급상승' },
  '105560': { name: 'KB금융', sector: '금융', thesis: '국내 금융지주 1위이면서 PBR 0.5배, 배당수익률 5%+. 밸류업 프로그램으로 자사주 소각과 배당 확대가 진행되며 주주가치 제고 중', whyNow: '정부 밸류업 정책의 최대 수혜주. 자사주 소각 프로그램이 본격화되면서 PBR 리레이팅이 진행 중', drivers: ['자산관리 확대', '디지털 전환', '해외 진출'], risks: ['금리 인하 시 NIM 축소', '부동산 PF 부실'], catalysts: ['밸류업 프로그램(자사주 소각)', '배당 확대'], valuation: 'PBR 0.5배, 배당수익률 5%+', moat: '국내 금융지주 시가총액 1위, 보험+은행+증권 종합' },
  '055550': { name: '신한지주', sector: '금융', thesis: '리테일 고객 기반이 가장 탄탄한 금융지주. PBR 0.45배에 배당수익률 6% 가까이 되는 배당+가치 투자 종목', whyNow: '밸류업 공시와 자사주 소각 확대로 PBR 정상화 기대. 금리 인하 사이클에서도 안정적 수익 구조 유지', drivers: ['리테일 강점', '디지털 뱅킹', '동남아 진출'], risks: ['금리 하락 사이클', '대손충당금 확대'], catalysts: ['밸류업 공시', '자사주 소각 확대'], valuation: 'PBR 0.45배, 역대 최저 수준', moat: '리테일 고객 기반 탄탄, 안정적 수익 구조' },
  '068270': { name: '셀트리온', sector: '바이오', thesis: '바이오시밀러(바이오 복제약) 세계 1위. 개발부터 생산, 판매까지 수직계열화하여 원가 경쟁력이 압도적. 짐펜트라(자가면역 치료제)가 미국 시장 침투 중', whyNow: '셀트리온+헬스케어 합병으로 실적 통합 효과. 짐펜트라 미국 매출이 급증하면서 수익성 개선 구간 진입', drivers: ['바이오시밀러 글로벌 확대', 'ADC 신약', '자체 플랫폼'], risks: ['바이오시밀러 가격 경쟁', '신약 개발 불확실성'], catalysts: ['짐펜트라 미국 매출 확대', '신규 바이오시밀러 FDA 승인'], valuation: 'PER 30배, 바이오시밀러 수익 안정화 반영', moat: '바이오시밀러 글로벌 1위, 자체 생산-판매 수직계열화' },
  '003670': { name: '포스코홀딩스', sector: '철강/소재', thesis: '철강 회사에서 리튬~양극재까지 2차전지 소재 밸류체인을 구축한 기업. PBR 0.4배로 순자산의 40%에 거래 중이라 하방이 제한적', whyNow: '아르헨티나 리튬 공장 가동이 시작되면 소재 사업 매출이 급증할 전환점. 현 PBR 0.4배는 역사적 최저 수준', drivers: ['리튬 사업', '2차전지소재', '수소환원제철'], risks: ['철강 수요 둔화', '리튬 가격 하락'], catalysts: ['아르헨티나 리튬 공장 가동', '양극재 공장 증설'], valuation: 'PBR 0.4배로 자산가치 대비 심각한 저평가', moat: '조강 생산량 글로벌 6위, 리튬~양극재 밸류체인 확보' },
  '066570': { name: 'LG전자', sector: '가전/전장', thesis: '가전은 성숙 사업이지만, 전장(VS)사업과 webOS 플랫폼이 숨겨진 성장 동력. 가전 2위의 안정적 현금흐름 + 전장 성장성이 결합된 기업', whyNow: 'VS사업부 흑자 전환이 임박하면서 "가전 회사"에서 "모빌리티 회사"로 재평가받을 수 있는 시점. PER 10배는 전장 가치 미반영', drivers: ['전장(VS)사업 성장', '가전 프리미엄화', 'B2B 솔루션'], risks: ['가전 시장 경쟁', '전장 수익성 개선 속도'], catalysts: ['VS사업부 흑자 전환', 'webOS 플랫폼 매출'], valuation: 'PER 10배, 전장 가치 미반영 저평가', moat: '가전 글로벌 2위, 전장/구독형 서비스로 체질 전환' },
  '012450': { name: '한화에어로스페이스', sector: '방산/우주', thesis: 'NATO 방산 지출 확대와 폴란드 무장 현대화의 최대 수혜주. K9 자주포 세계 점유율 50%에 항공엔진까지 만드는 국내 유일 방산 종합 기업. 수주잔고가 60조원으로 향후 수년간 매출이 확보된 상태', whyNow: '유럽의 방산 지출이 GDP 대비 3%+로 확대되는 구조적 전환기. 폴란드 K9 1,000문 수주가 확정되면 수주잔고가 80조원 이상으로 급증', drivers: ['K9 자주포 수출', '항공엔진', '우주발사체'], risks: ['방산 수주 변동성', '원자재 가격'], catalysts: ['폴란드 K9 1,000문 수주', '누리호 4차 발사', 'NATO 방산 지출 확대'], valuation: 'PER 25배이나 수주잔고 60조원 감안 시 적정', moat: '국내 유일 항공엔진 제조, K9 자주포 세계 시장 점유율 50%' },
  '047810': { name: '한국항공우주', sector: '방산/항공', thesis: '한국이 독자 개발한 4.5세대 전투기 KF-21을 생산하는 유일한 기업. FA-50 경공격기 수출도 확대되면서 "한국판 록히드마틴"으로 성장 중', whyNow: 'KF-21 초도양산이 시작되면 수주잔고가 급증할 변곡점. 폴란드 FA-50 후속 계약이 체결되면 유럽 방산 시장 진입이 본격화', drivers: ['KF-21 양산', 'FA-50 수출', '무인기 사업'], risks: ['국방예산 변동', '개발비 증가'], catalysts: ['폴란드 FA-50 후속 계약', 'KF-21 초도양산'], valuation: 'PER 30배, 방산주 프리미엄 적용', moat: '국내 유일 전투기 제조사, KF-21 독점' },
  '042700': { name: '한미반도체', sector: '반도체장비', thesis: 'HBM 칩을 만들 때 반드시 필요한 TC본더 장비를 세계 시장에서 90%+ 독점 공급하는 기업. AI 반도체 투자가 늘수록 직접 수혜를 받는 "곡괭이 장수"', whyNow: 'HBM4로 세대 전환이 되면 새로운 TC본더 장비 수요가 폭증. 삼성전자까지 고객으로 확보하면 매출이 2배 이상 급증 가능', drivers: ['TC본더 독점 공급', 'HBM 관련 수혜', '후공정 장비'], risks: ['고객사 집중(SK하이닉스)', '중국 수출 규제'], catalysts: ['HBM4 TC본더 수주 확대', '삼성전자 고객 확보'], valuation: 'PER 35배, HBM 독점 장비 프리미엄', moat: 'HBM TC본더 세계 시장 점유율 90%+, 대체 불가' },
  '443060': { name: '레인보우로보틱스', sector: '로봇', thesis: '삼성전자가 지분 투자한 국내 유일 휴머노이드 로봇 기업. 테슬라 옵티머스처럼 휴머노이드 로봇이 상용화되면 한국 대표 수혜주', whyNow: '삼성전자와 AI 로봇 협업이 구체화되는 시점. 매출보다 미래 가치에 베팅하는 구간이지만, 로봇 테마가 본격화되기 전 선점 기회', drivers: ['휴머노이드 로봇', '산업용 협동로봇', '삼성 투자'], risks: ['적자 지속', '상용화 시기 불확실'], catalysts: ['삼성전자와 AI 로봇 협업', '휴머노이드 시제품'], valuation: '매출 미미하나 미래 가치 반영 프리미엄', moat: '삼성전자 지분 투자를 받은 국내 유일 휴머노이드 로봇' },
  '352820': { name: '하이브', sector: '엔터/콘텐츠', thesis: 'BTS를 보유한 K-pop 글로벌 1위 엔터. 위버스 팬 플랫폼으로 아티스트-팬 직접 연결 생태계를 구축해 "팬덤의 디즈니"를 지향', whyNow: 'BTS 단체 활동 복귀가 확정되면 실적이 폭발적으로 증가할 것. 현재 주가는 BTS 부재 시기의 저점', drivers: ['BTS 활동 재개', '위버스 플랫폼', '멀티레이블'], risks: ['아티스트 의존도', '경쟁 심화(SM/YG/JYP)'], catalysts: ['BTS 단체 활동 복귀', '신인 그룹 데뷔'], valuation: 'PER 40배대, 엔터 프리미엄이나 BTS 리스크 반영', moat: 'K-pop 글로벌 1위 레이블, 위버스 팬 플랫폼 독점' },
  '298040': { name: '효성중공업', sector: '전력기기', thesis: 'AI 데이터센터에는 막대한 전력이 필요하고, 그 전력을 전달하는 초고압 변압기의 글로벌 Top 5 제조사. AI 투자 → 데이터센터 건설 → 전력 인프라 수요 폭증이라는 확실한 수혜 구조', whyNow: '수주잔고가 역대 최대를 경신 중이고, 미국 현지 생산 능력까지 확보. 전력기기 슈퍼사이클의 초입 단계', drivers: ['변압기 수출 호황', '미국 전력망 투자', '신재생 인프라'], risks: ['원자재 가격 변동', '수주 사이클'], catalysts: ['미국 AI 데이터센터 전력 수요 폭증', '수주잔고 역대 최대'], valuation: 'PER 15배, 전력기기 수출 호황 지속 시 추가 상승 여력', moat: '초고압 변압기 글로벌 Top 5, 미국 현지 생산 능력' },
  '267260': { name: '현대일렉트릭', sector: '전력기기', thesis: '초고압 변압기/차단기 전문 기업. 미국/중동의 전력 인프라 노후화와 AI 데이터센터 전력 수요가 만들어낸 슈퍼사이클의 핵심 수혜주', whyNow: '수주잔고가 급증하면서 향후 2-3년 실적 가시성이 매우 높음. 전력기기 업종 전체가 구조적 성장 국면에 진입', drivers: ['초고압 변압기/차단기', '해상풍력', '전력인프라'], risks: ['납기지연 리스크', '원자재 가격'], catalysts: ['미국/중동 변압기 대형 수주', '전력기기 슈퍼사이클'], valuation: 'PER 20배, 수주잔고 급증으로 실적 가시성 높음', moat: '초고압 GIS 차단기 기술력, 현대중공업그룹 시너지' },
  '454910': { name: '두산로보틱스', sector: '로봇', thesis: '협동로봇 기술력 국내 1위, 글로벌 Top 5. 제조업 인력난으로 로봇 자동화 수요가 구조적으로 증가하는 메가트렌드의 수혜주', whyNow: '미국 시장 진출이 본격화되면서 글로벌 매출 비중이 높아지는 시점. 신규 로봇 모델 출시로 제품 라인업 확대', drivers: ['협동로봇 글로벌 확대', '서빙로봇', '물류 자동화'], risks: ['적자 지속', '글로벌 경쟁(유니버설로봇)'], catalysts: ['미국 시장 진출 확대', '신규 로봇 모델 출시'], valuation: '매출 대비 고평가, 성장 기대감 반영', moat: '협동로봇 기술력 국내 1위, 글로벌 Top 5' },
  '326030': { name: 'SK바이오팜', sector: '바이오/제약', thesis: 'SK가 자체 개발한 뇌전증 신약 세노바메이트가 FDA 승인을 받고 미국에서 직접 판매 중. 한국 제약사 중 유일하게 자체 신약으로 글로벌 시장을 공략하는 기업', whyNow: '세노바메이트 유럽 매출이 본격화되면서 글로벌 블록버스터 신약으로 성장 중. 신규 적응증 승인 시 시장 확대', drivers: ['세노바메이트(뇌전증 치료제)', '신약 파이프라인', '글로벌 판매'], risks: ['신약 경쟁', '파이프라인 리스크'], catalysts: ['세노바메이트 유럽 매출 확대', '신규 적응증 승인'], valuation: 'PER 40배, 신약 가치 반영', moat: '자체 개발 뇌전증 신약 FDA 승인, 글로벌 직접 판매' },
  '259960': { name: '크래프톤', sector: '게임', thesis: '배틀그라운드 하나로 글로벌 누적 매출 6조원을 만든 IP 괴물. 인도에서는 국민게임 지위로 모바일 매출이 꾸준히 증가하고, 현금 3조원+ 보유', whyNow: '신작 인조이 출시로 배그 의존도 탈피 가능성. PER 15배에 현금만 3조원이라 밸류에이션 부담이 낮음', drivers: ['배틀그라운드 IP', '인도/동남아 모바일', '신규 게임'], risks: ['배그 의존도', '신작 흥행 불확실'], catalysts: ['인조이 출시', '배그 신규 콘텐츠'], valuation: 'PER 15배, 현금 보유량 3조원+', moat: '배틀그라운드 글로벌 누적 매출 6조원, 인도 국민게임' },
  '086790': { name: '하나금융지주', sector: '금융', thesis: '기업금융 시장 점유율 1위 금융지주. PBR 0.4배에 배당수익률 6%로 배당만으로도 투자 가치가 충분. 밸류업 프로그램으로 주주환원 강화 중', whyNow: '자사주 매입/소각 확대로 PBR 정상화 기대. 금융지주 중 밸류업 의지가 가장 강하다는 평가', drivers: ['기업금융 강점', '디지털 전환', '해외 자회사'], risks: ['금리 인하 영향', '부동산 PF 리스크'], catalysts: ['밸류업 프로그램', '자사주 매입/소각 확대'], valuation: 'PBR 0.4배, 배당수익률 6%', moat: '기업금융 시장 점유율 1위, 안정적 수익 기반' },
  '079550': { name: 'LIG넥스원', sector: '방산', thesis: '천궁II 미사일, 해성 대함미사일 등 유도무기를 만드는 국내 유일 기업. 중동 국가들의 미사일 방어 체계 수요가 급증하면서 수출 확대', whyNow: 'UAE/사우디 등 중동 수출이 본격화되는 시점. 국내 방산 수출의 새로운 축으로 유도무기가 부상 중', drivers: ['유도무기 수출', '해군 무기체계', '우주 방어'], risks: ['국방 예산 변동성', '수출 허가 리스크'], catalysts: ['중동 미사일 방어 체계 수주', 'UAE/사우디 수출'], valuation: 'PER 20배, 방산 수출 확대 프리미엄', moat: '국내 유일 유도무기 전문, 천궁II/해성 등 핵심 무기' },
  '058470': { name: '리노공업', sector: '반도체 부품', thesis: 'AI 칩을 테스트할 때 필수적인 IC 테스트소켓을 세계 시장 30% 점유. AI 칩이 복잡해질수록 테스트 횟수가 늘어나 자연스럽게 매출 증가', whyNow: 'AI 칩 테스트 수요가 급증하면서 기존 고객사 물량이 자연 확대 중. 니치 마켓 독점이라 경쟁 진입이 어려운 구조', drivers: ['IC 테스트소켓', '5G/AI 칩 테스트 수요'], risks: ['고객사 집중', '반도체 사이클'], catalysts: ['AI 칩 테스트 수요 급증', '신규 제품 라인업'], valuation: 'PER 25배, 안정적 성장 반영', moat: 'IC 테스트소켓 세계 시장 점유율 30%, 니치 마켓 강자' },
  '039030': { name: '이오테크닉스', sector: '레이저장비', thesis: '반도체 후공정에 필수적인 레이저 장비를 삼성/SK에 공급하는 국내 1위 기업. HBM 패키징이 복잡해질수록 레이저 가공 수요가 급증', whyNow: 'HBM4용 레이저 가공 장비 수주가 확대되면서 AI 반도체 후공정의 핵심 수혜. 차세대 패키징 수요가 본격화되는 시점', drivers: ['반도체 레이저 가공', 'OLED 수리 장비', 'PCB 미세화'], risks: ['장비 사이클', '기술 대체 리스크'], catalysts: ['HBM 레이저 가공 장비 수주', '차세대 패키징 수요'], valuation: 'PER 20배, 반도체 후공정 확대 수혜', moat: '반도체용 레이저 장비 국내 1위, 삼성/SK 주요 공급' },
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
  const thesis = meta?.thesis || `${stockName}은 ${sector}의 핵심 기업`;
  const whyNow = meta?.whyNow || '현 시점에서 매력적인 진입 구간';
  const d1 = meta?.drivers?.[0] || '핵심 사업';
  const d2 = meta?.drivers?.[1] || '사업 확대';
  const r1 = meta?.risks?.[0] || '시장 변동성';
  const r2 = meta?.risks?.[1] || '경쟁 심화';
  const cat1 = meta?.catalysts?.[0] || '실적 개선';
  const val = meta?.valuation || '현 밸류에이션 적정';
  const moat = meta?.moat || '업종 내 경쟁력 보유';

  // ===== Round 1: 핵심 투자논리 제시 =====
  const claude_r1 = cScore >= 4
    ? `📊 핵심 투자논리: ${thesis}. 밸류에이션을 보면 ${val}이라서 지금 진입해도 하방 리스크가 제한적입니다. 특히 ${whyNow}라는 점에서 타이밍도 좋습니다. ${r1} 리스크는 있지만, ${moat}라는 해자가 이를 상쇄합니다. ${cScore}점, 높은 확신으로 추천합니다.`
    : cScore >= 3
      ? `📊 ${stockName}의 투자 포인트는 ${thesis}입니다. ${val}이라 극단적으로 비싸진 않지만, ${r1} 리스크를 감안하면 적극 매수까진 아닙니다. ${d1}의 매출 기여도가 확인된 후 비중을 높여도 늦지 않아요. ${cScore}점 부여합니다.`
      : cScore >= 1
        ? `📊 ${stockName}의 투자논리(${thesis})는 이해하지만, 현재 ${val}으로는 안전마진이 부족합니다. ${r1}과 ${r2}를 동시에 감수하면서까지 진입할 이유가 약해요. 같은 ${sector}에서 더 매력적인 밸류에이션의 종목이 있습니다. ${cScore}점입니다.`
        : `📊 ${stockName}은 패스합니다. ${val}을 볼 때 이미 시장 기대가 주가에 반영되어 있고, ${r1} 리스크 대비 기대수익률이 매력적이지 않습니다.`;

  const gemini_r1 = gScore >= 4
    ? `🚀 ${stockName}을 사야 하는 이유를 한 마디로 하면: ${thesis}. 지금이 특히 좋은 이유는, ${whyNow}이기 때문이에요. ${cat1}까지 현실화되면? 주가가 한 단계 점프하는 리레이팅 구간이 올 겁니다. ${moat}라는, 경쟁자가 쉽게 따라올 수 없는 강력한 해자까지 있어요. ${gScore}점, 이건 꼭 담아야 할 종목입니다!`
    : gScore >= 3
      ? `🚀 ${stockName}의 스토리는 꽤 괜찮아요. ${thesis}라는 투자논리가 있고, ${d1}에서 성장 모멘텀이 보여요. 다만 ${r1}이 변수이고, ${cat1}의 실현 시점이 좀 불확실합니다. 장기 보유 관점이라면 OK이지만, 단기 트레이딩엔 애매해요. ${gScore}점입니다.`
      : gScore >= 1
        ? `🚀 솔직히 ${stockName}보다 더 exciting한 종목이 있어요. ${thesis}라는 논리는 이해하지만, ${r1}과 ${r2}를 보면 위험 대비 기대수익이 부족해요. ${sector} 내에서 더 파괴적인 성장 스토리에 투자하고 싶습니다. ${gScore}점이에요.`
        : `🚀 ${stockName}은 제 리스트에서 뺐어요. ${sector}에서 더 빠르게 성장하는 기회가 있는데, 여기에 자금을 묶어둘 이유가 없습니다.`;

  const gpt_r1 = tScore >= 4
    ? `🌍 거시적 관점에서 ${stockName}은 매력적입니다. 왜냐하면 ${thesis}이기 때문이에요. 현 글로벌 환경에서 ${d1}은 구조적 수혜 영역이고, ${whyNow}라는 타이밍적 요인도 중요합니다. ${val}에서의 진입은 리스크-리턴 비율이 양호합니다. ${tScore}점, 포트폴리오에 편입할 가치가 있습니다.`
    : tScore >= 3
      ? `🌍 ${stockName}의 투자논리는 ${thesis}입니다. 매크로 환경에서 ${d1}이 긍정적이지만, ${r1}이라는 변수가 있어요. ${val}에서 진입하면 중기적으로 괜찮지만, 포트폴리오 비중은 보수적으로 잡겠습니다. ${tScore}점입니다.`
      : tScore >= 1
        ? `🌍 ${stockName}은 ${thesis}라는 논리가 있지만, 현 매크로 환경에서 ${r1}이 해소되지 않았습니다. 리스크 관리 차원에서 ${tScore}점에 그칩니다. 환경이 바뀌면 재검토하겠습니다.`
        : `🌍 현 매크로 환경에서 ${stockName}은 리스크가 너무 큽니다. ${r1}과 ${r2}가 겹치면서 안전마진이 부족합니다. 포트폴리오에서 제외합니다.`;

  // ===== Round 2: 진짜 디베이트 =====
  const claude_r2 = cScore >= 3
    ? `제미 나인이 "${cat1}" 카탈리스트를 강조했는데, 맞는 말이에요. 하지만 그게 주가에 얼마나 반영될지가 중요합니다. ${stockName}은 ${val}이라서 이미 기대감이 상당 부분 들어가 있어요. G.P. 테일러의 매크로 관점도 유효합니다. 결론: ${cScore}점 유지. ${whyNow}라는 타이밍 논리는 수긍하되, 밸류에이션 안전마진을 확보한 가격에서 진입하는 게 현명합니다.`
    : `제미 나인과 G.P.가 ${d1}의 성장성에 베팅하자고 했지만, 제 DCF 모델에서는 현 주가가 이미 낙관적 시나리오를 반영 중이에요. ${r1} 리스크가 현실화되면 하방이 열러 있습니다. ${cScore}점 유지합니다.`;

  const gemini_r2 = gScore >= 3
    ? `클로드 리가 밸류에이션 우려를 했는데요, ${val}이 비싸 보일 수 있지만, 핵심은 이거예요: ${moat}. 이런 해자를 가진 기업에 싼 가격은 없어요. 사실 "${whyNow}"라는 점을 생각하면 지금이 가장 싼 시점일 수 있습니다. G.P. 테일러의 매크로 분석은 존중하지만, ${sector}는 경기와 독립적인 구조적 성장이에요. ${gScore}점 유지!`
    : `클로드의 밸류에이션 분석은 일리가 있어요. ${sector}를 숫자로만 판단하면 매력이 떨어지는 건 사실이에요. 하지만 ${d1}의 장기 잠재력은 아직 주가에 반영이 안 됐다고 봅니다. 그래도 지금 올인하기엔 ${r1} 리스크가 부담이라 ${gScore}점을 유지합니다.`;

  const gpt_r2 = tScore >= 3
    ? `클로드는 밸류에이션, 제미는 성장 모멘텀. 두 관점 모두 맞습니다. 제가 보충할 건 수급 관점이에요. ${stockName}은 ${d1}이 글로벌 메가트렌드와 맞물려 있어 기관/외국인 자금이 유입되기 좋은 구조입니다. ${r1}은 모니터링해야 하지만, 포지션을 아예 잡지 않는 것보다 분할로 진입하는 게 유리하다고 봅니다. ${tScore}점 유지합니다.`
    : `클로드와 제미 나인의 포인트를 종합하면, ${stockName}은 장기적으로 좋지만 지금 올인하기엔 ${r1} 리스크가 해소되지 않았어요. 매크로 환경이 우호적으로 바뀔 때까지 관망이 현명합니다. ${tScore}점 유지합니다.`;

  // ===== Round 3: 결론 + 투자 판단 =====
  const claude_r3 = cScore >= 3
    ? `✅ 최종: ${stockName}을 ${rank}위로 확정합니다. ${isUnanimous ? '3명 만장일치' : '다수결'}로 평균 ${avgScore.toFixed(1)}점. 추천 핵심 이유: ${thesis}. 그리고 ${whyNow}라는 타이밍적 요인까지 겹쳤습니다.`
    : `${stockName}은 ${rank > 0 ? `${rank}위에 올렸지만 확신도는 낮습니다.` : '이번 Top 5에서 제외합니다.'} ${r1}이 해소되면 재검토하겠습니다.`;

  const gemini_r3 = gScore >= 3
    ? `✅ ${stockName} ${rank}위 확정! ${isUnanimous ? '만장일치라 확신이 높아요!' : '약간의 의견 차이가 있었지만 합의!'} 핵심은 ${moat}라는 경쟁우위. 이런 기업은 시장이 흔들릴 때 오히려 기회가 됩니다.`
    : `${stockName}이 ${rank > 0 ? `${rank}위에 들어갔지만 ` : '이번엔 빠졌는데, '}솔직히 저는 더 explosive한 종목이 있다고 봤어요. 다음엔 다시 평가해볼게요!`;

  const gpt_r3 = tScore >= 3
    ? `✅ 최종 결론: ${stockName} ${rank}위. ${isUnanimous ? '전원 동의로 확신도 높음.' : '논쟁 끝에 합의.'} 핵심 판단 근거: ${thesis}이며, ${val}에서의 진입은 리스크 대비 ${avgScore >= 4 ? '매우 양호한' : '적절한'} 기대수익률을 제공합니다.`
    : `${stockName}은 ${rank > 0 ? `${rank}위로 합의했지만 ` : '이번 Top 5에서 제외.'} 리스크 관리를 우선시한 결정입니다.`;

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
