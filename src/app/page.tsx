import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">Duskwarden Tools</h1>
          <Link
            href="/app"
            className="px-4 py-2 bg-accent text-bg-base font-medium rounded-lg hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
          >
            Open App
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mb-6">
            Your Creature Conversion Workbench
          </h2>
          <p className="text-lg text-text-muted mb-8">
            A fast, focused tool for tabletop GMs. Paste stat blocks from any system, convert them to your format, and organize your campaign content.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="px-6 py-3 bg-accent text-bg-base font-semibold rounded-lg hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
            >
              Get Started
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="p-6 bg-bg-surface border border-border rounded-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Quick Conversion</h3>
              <p className="text-sm text-text-muted">Paste any stat block and convert it with adjustable difficulty sliders.</p>
            </div>

            <div className="p-6 bg-bg-surface border border-border rounded-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Organized Library</h3>
              <p className="text-sm text-text-muted">Search, filter, and organize your creatures and notes by project.</p>
            </div>

            <div className="p-6 bg-bg-surface border border-border rounded-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Easy Export</h3>
              <p className="text-sm text-text-muted">Copy to clipboard, export JSON, or print-friendly cards for the table.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-text-muted">
            Duskwarden Tools is an independent product and is not affiliated with The Arcane Library, LLC.
          </p>
        </div>
      </footer>
    </div>
  );
}
