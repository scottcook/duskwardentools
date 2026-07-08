import { useState, type ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
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

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brand">
            <h1 className="wm">
              <Link to="/">
                <span className="acc">D</span>uskwarden
              </Link>
            </h1>
            <p className="tag">
              Monster transmutation engine — drag your horrors across the veil, system to system.
            </p>
          </div>
          <div className="meta">
            Eight tongues spoken
            <br />
            Homebrew arithmetic
            <br />
            Anno MMXXVI
          </div>
        </header>

        <nav className="nav" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => 'navlink' + (isActive ? ' on' : '')}
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
            >
              ♥ Support
            </a>
            <button className="navlink" onClick={showFeedback}>
              Feedback
            </button>
          </div>
        </nav>

        {IS_DEMO && (
          <div className="demobar">
            Demo mode · data is stored only in this browser. Set{' '}
            <b>VITE_SUPABASE_URL</b> &amp; <b>VITE_SUPABASE_ANON_KEY</b> to use the live database.
          </div>
        )}

        <main>{children}</main>

        <footer className="foot">
          <span>
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
