import Link from 'next/link';

export function Header() {
  return (
    <header className="fixed top-[41px] left-0 right-0 z-40">
      <div className="container-app py-4">
        <nav className="glass rounded-2xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-dark-100 group-hover:text-white transition-colors">
              StockHero
            </span>
          </Link>
          
          <div className="flex items-center gap-1">
            <Link 
              href="/verdict" 
              className="px-4 py-2 text-sm text-dark-400 hover:text-dark-100 hover:bg-dark-800/50 rounded-lg transition-all"
            >
              Top 5
            </Link>
            <Link 
              href="/archive" 
              className="px-4 py-2 text-sm text-dark-400 hover:text-dark-100 hover:bg-dark-800/50 rounded-lg transition-all"
            >
              Archive
            </Link>
            <Link 
              href="/battle/005930" 
              className="ml-2 btn-primary text-sm px-4 py-2"
            >
              Watch Debate
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
