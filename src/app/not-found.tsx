import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-text-primary">Page not found</h1>
      <p className="mt-3 text-sm text-text-muted">
        The page you were looking for does not exist or may have moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Go home
        </Link>
        <Link
          href="/app"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg-base transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Open app
        </Link>
      </div>
    </main>
  );
}
