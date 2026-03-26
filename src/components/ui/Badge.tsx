import { type HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'accent' | 'success' | 'error' | 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-(--badge-default-bg) text-(--badge-default-text) border-(--badge-default-border)',
  accent: 'bg-(--badge-accent-bg) text-(--badge-accent-text) border-(--badge-accent-border)',
  success: 'bg-(--badge-success-bg) text-(--badge-success-text) border-(--badge-success-border)',
  error: 'bg-(--badge-error-bg) text-(--badge-error-text) border-(--badge-error-border)',
  tier1: 'bg-(--badge-tier1-bg) text-(--badge-tier1-text) border-(--badge-tier1-border)',
  tier2: 'bg-(--badge-tier2-bg) text-(--badge-tier2-text) border-(--badge-tier2-border)',
  tier3: 'bg-(--badge-tier3-bg) text-(--badge-tier3-text) border-(--badge-tier3-border)',
  tier4: 'bg-(--badge-tier4-bg) text-(--badge-tier4-text) border-(--badge-tier4-border)',
  tier5: 'bg-(--badge-tier5-bg) text-(--badge-tier5-text) border-(--badge-tier5-border)',
};

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}

export function ThreatBadge({ tier }: { tier: 1 | 2 | 3 | 4 | 5 }) {
  const labels = {
    1: 'Tier 1 - Trivial',
    2: 'Tier 2 - Easy',
    3: 'Tier 3 - Moderate',
    4: 'Tier 4 - Hard',
    5: 'Tier 5 - Deadly',
  };

  return <Badge variant={`tier${tier}` as BadgeVariant}>{labels[tier]}</Badge>;
}
