import { useState, type ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Textures } from './Textures'
import { IdentityModal } from './IdentityModal'
import { IS_DEMO } from '../lib/config'

const NAV = [
  { to: '/', label: 'Projects', end: true },
  { to: '/library', label: 'Library', end: false },
  { to: '/convert', label: 'Converter', end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState(false)

  return (
    <>
      <Textures />
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
          <span>
            <button className="link-btn mn" style={{ fontSize: 10.5 }} onClick={() => setIdentity(true)}>
              ✦ your warden's mark
            </button>
          </span>
        </footer>
      </div>

      {identity && <IdentityModal onClose={() => setIdentity(false)} />}
    </>
  )
}
