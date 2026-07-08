export function NewsletterSignupLink() {
  return (
    <button
      type="button"
      className="foot-link"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('duskwarden-show-newsletter'))
      }}
    >
      ✉ newsletter
    </button>
  )
}
