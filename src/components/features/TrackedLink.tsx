'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEventHandler, ReactNode } from 'react';
import { trackEvent, type AnalyticsProperties } from '@/lib/analytics';

interface TrackedLinkProps extends Omit<ComponentProps<typeof Link>, 'onClick'> {
  children: ReactNode;
  eventName: string;
  eventProperties?: AnalyticsProperties;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function TrackedLink({
  children,
  eventName,
  eventProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventProperties);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
