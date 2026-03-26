'use client';

import { siteConfig } from '@/lib/seo';
import { trackEvent } from '@/lib/analytics';

interface SupportLinkProps {
  location?: string;
  className?: string;
  variant?: 'inline' | 'button';
}

function HeartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}

export function SupportLink({
  location = 'unknown',
  className,
  variant = 'inline',
}: SupportLinkProps) {
  const handleClick = () => {
    trackEvent('support_link_click', { location, variant });
  };

  if (variant === 'button') {
    return (
      <a
        href={siteConfig.donateUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={
          className ??
          'inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-accent'
        }
      >
        <HeartIcon />
        Support this project
      </a>
    );
  }

  return (
    <a
      href={siteConfig.donateUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={
        className ??
        'inline-flex items-center gap-1.5 text-accent hover:text-accent-hover transition-colors underline underline-offset-2 text-xs'
      }
    >
      <HeartIcon className="w-3 h-3" />
      Support
    </a>
  );
}
