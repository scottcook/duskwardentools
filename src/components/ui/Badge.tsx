import { type HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'accent' | 'success' | 'error' | 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-elevated text-text-muted border-border',
  accent: 'bg-accent/20 text-accent border-accent/30',
  success: 'bg-success/20 text-success border-success/30',
  error: 'bg-error/20 text-error border-error/30',
  tier1: 'bg-green-900/30 text-green-400 border-green-700/50',
  tier2: 'bg-blue-900/30 text-blue-400 border-blue-700/50',
  tier3: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50',
  tier4: 'bg-orange-900/30 text-orange-400 border-orange-700/50',
  tier5: 'bg-red-900/30 text-red-400 border-red-700/50',
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
