import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { IdentityModal } from './IdentityModal'
import { FeedbackModal } from './FeedbackModal'
import { NewsletterModal } from './NewsletterModal'
import { NewsletterSignupLink } from './NewsletterSignupLink'
import { SupportLink } from './SupportLink'
import { DONATE_URL } from '../lib/contact'
import { IS_DEMO } from '../lib/config'

function showFeedback() {
  window.dispatchEvent(new CustomEvent('duskwarden-show-feedback'))
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z"
      />
    </svg>
  )
}

const NAV = [
  { to: '/convert', label: 'Converter', end: false },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/library', label: 'Library', end: false },
]

type Theme = 'light' | 'dark'

const THEME_KEY = 'duskwarden-theme'

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'light' ? '#f4efe6' : '#0b0908',
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const location = useLocation()

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setTheme(next)
  }

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onShowIdentity = () => setIdentity(true)
    window.addEventListener('duskwarden-show-identity', onShowIdentity)
    return () => window.removeEventListener('duskwarden-show-identity', onShowIdentity)
  }, [])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [navOpen])

  function closeNav() {
    setNavOpen(false)
  }

  return (
    <>
      <div className="app">
        <div className="site-header">
          <header className="top">
            <div className="brand">
              <h1 className="wm">
                <Link to="/" onClick={closeNav}>
                  <span className="acc">D</span>uskwarden
                </Link>
              </h1>
              <p className="tag">
                Monster transmutation engine — drag your horrors across the veil, system to system.
              </p>
            </div>
            <div className="top-end">
              <button
                type="button"
                className="theme-toggle"
                aria-pressed={theme === 'light'}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={toggleTheme}
              >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
              <div className="meta">
                Eight tongues spoken
                <br />
                Homebrew arithmetic
                <br />
                Anno MMXXVI
              </div>
              <button
                type="button"
                className="nav-toggle"
                aria-expanded={navOpen}
                aria-controls="site-nav"
                onClick={() => setNavOpen((open) => !open)}
              >
                <span className="sr-only">{navOpen ? 'Close menu' : 'Open menu'}</span>
                <span className="nav-toggle-bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </header>

          {navOpen && (
            <button
              type="button"
              className="nav-backdrop"
              aria-label="Close menu"
              onClick={closeNav}
            />
          )}

          <nav
            id="site-nav"
            className={'nav' + (navOpen ? ' nav-open' : '')}
            aria-label="Primary"
          >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => 'navlink' + (isActive ? ' on' : '')}
              onClick={closeNav}
            >
              {n.label}
            </NavLink>
          ))}
          <div className="nav-aux">
            <a
              className="navlink"
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeNav}
            >
              ♥ Support
            </a>
            <button
              className="navlink"
              onClick={() => {
                closeNav()
                showFeedback()
              }}
            >
              Feedback
            </button>
          </div>
          </nav>
        </div>

        {IS_DEMO && (
          <div className="demobar">
            Demo mode · data is stored only in this browser. Set{' '}
            <b>VITE_SUPABASE_URL</b> &amp; <b>VITE_SUPABASE_ANON_KEY</b> to use the live database.
          </div>
        )}

        <main>{children}</main>

        <footer className="foot">
          <span className="foot-copy">
            Duskwarden · transmutation is homebrew arithmetic, not law — the table's ruling is final
          </span>
          <span className="foot-links">
            <SupportLink />
            <NewsletterSignupLink />
            <button className="foot-link" onClick={showFeedback}>
              ✎ send word
            </button>
            <button className="foot-link" onClick={() => setIdentity(true)}>
              ✦ your warden's mark
            </button>
          </span>
        </footer>
      </div>

      {identity && <IdentityModal onClose={() => setIdentity(false)} />}
      <FeedbackModal />
      <NewsletterModal />
    </>
  )
}
