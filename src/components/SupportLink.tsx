import { DONATE_URL } from '../lib/contact'

/** External "Buy Me a Coffee" link, styled per context. */
export function SupportLink({ variant = 'link' }: { variant?: 'link' | 'button' }) {
  if (variant === 'button') {
    return (
      <a className="btn" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
        ♥ Support this project
      </a>
    )
  }
  return (
    <a className="foot-link" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
      ♥ buy us a coffee
    </a>
  )
}
