import Link from 'next/link';
import { DisclaimerBar, Header, CharacterAvatar } from '@/components';
import { CHARACTERS } from '@/lib/characters';

export default function HomePage() {
  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 bg-dark-950" />
        <div className="fixed inset-0 bg-grid opacity-50" />
        <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[128px] -translate-y-1/2" />
        <div className="fixed top-1/3 right-0 w-[400px] h-[400px] bg-accent-purple/15 rounded-full blur-[100px]" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-accent-cyan/10 rounded-full blur-[120px] translate-y-1/2" />

        {/* Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-40">
          <div className="container-app">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/60 border border-dark-700/50 text-sm text-dark-300 mb-8 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live AI Debate
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="text-dark-50">AI가 토론하는</span>
                <br />
                <span className="gradient-text">주식 분석의 미래</span>
              </h1>
              
              <p className="text-lg md:text-xl text-dark-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Claude, Gemini, GPT 세 AI가 실시간으로 종목을 분석하고 토론합니다.
                다양한 관점을 통해 더 깊은 인사이트를 경험하세요.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/verdict" className="btn-primary px-8 py-4 text-base">
                  오늘의 Top 5 보기
                </Link>
                <Link href="/archive" className="btn-outline px-8 py-4 text-base">
                  성과 확인하기
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { value: '3', label: 'AI Models' },
                { value: '20+', label: 'Daily Picks' },
                { value: '60%+', label: 'Accuracy' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-dark-50 mb-1">{stat.value}</div>
                  <div className="text-sm text-dark-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Characters Section */}
        <section className="relative py-24 border-t border-dark-800/50">
          <div className="container-app">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-dark-50 mb-4">
                Meet the Analysts
              </h2>
              <p className="text-dark-400 max-w-xl mx-auto">
                각자의 전문 분야와 분석 스타일을 가진 AI 애널리스트들
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {(['claude', 'gemini', 'gpt'] as const).map((charId) => {
                const char = CHARACTERS[charId];
                return (
                  <div key={charId} className="card-interactive group">
                    <div className="flex items-center gap-4 mb-6">
                      <CharacterAvatar character={charId} size="xl" />
                      <div>
                        <h3 className="font-semibold text-dark-100 group-hover:text-white transition-colors">{char.name}</h3>
                        <p className="text-sm text-dark-500">{char.role}</p>
                      </div>
                    </div>
                    <p className="text-dark-400 text-sm leading-relaxed mb-4">
                      {char.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {char.tags.map((tag) => (
                        <span key={tag} className={`badge ${char.bgColor} ${char.color} border-current/20`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative py-24 border-t border-dark-800/50">
          <div className="container-app">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-dark-50 mb-4">
                How It Works
              </h2>
              <p className="text-dark-400 max-w-xl mx-auto">
                3단계로 이해하는 AI 종목 토론
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: '01', title: 'AI 토론', desc: '3명의 AI가 각자의 관점에서 종목을 분석하고 의견을 교환합니다' },
                { step: '02', title: '합의 도출', desc: '만장일치 또는 가중 평균으로 Top 5 종목을 선정합니다' },
                { step: '03', title: '성과 공개', desc: '과거 예측의 적중률을 투명하게 공개합니다' },
              ].map((item, i) => (
                <div key={item.step} className="relative">
                  <div className="text-6xl font-bold text-dark-800/50 mb-4">{item.step}</div>
                  <h3 className="text-xl font-semibold text-dark-100 mb-2">{item.title}</h3>
                  <p className="text-dark-400 text-sm leading-relaxed">{item.desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 -right-4 w-8 text-dark-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 border-t border-dark-800/50">
          <div className="container-narrow text-center">
            <div className="card bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800 border-dark-700/50 p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-dark-50 mb-4">
                Start Watching
              </h2>
              <p className="text-dark-400 mb-8 max-w-md mx-auto">
                AI 3대장의 종목 토론을 무료로 관전하세요
              </p>
              <Link href="/verdict" className="btn-primary px-10 py-4 text-base">
                오늘의 Top 5 확인하기
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative py-12 border-t border-dark-800/50">
          <div className="container-app">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-dark-300">StockHero</span>
                <span className="badge-warning">Entertainment Only</span>
              </div>
              <p className="text-sm text-dark-500 text-center md:text-right max-w-md">
                투자 자문이 아닌 콘텐츠입니다. 투자 판단의 책임은 본인에게 있습니다.
              </p>
            </div>
          </div>
        </footer>
      </main>
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}
