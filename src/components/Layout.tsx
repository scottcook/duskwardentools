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

const NAV = [
  { to: '/convert', label: 'Converter', end: false },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/library', label: 'Library', end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

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
