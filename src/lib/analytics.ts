'use client';

import { track } from '@vercel/analytics';

type AnalyticsValue = string | number | boolean;

export type AnalyticsProperties = Record<string, AnalyticsValue | undefined>;

export function trackEvent(name: string, properties?: AnalyticsProperties) {
  const cleanedProperties = properties
    ? Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined))
    : undefined;

  track(name, cleanedProperties);
}
