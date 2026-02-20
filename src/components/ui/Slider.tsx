'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = true, valueFormatter, className = '', id, value, ...props }, ref) => {
    const sliderId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const displayValue = valueFormatter
      ? valueFormatter(Number(value))
      : `${value}`;

    return (
      <div className="w-full">
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            {label && (
              <label htmlFor={sliderId} className="text-sm font-medium text-text-primary">
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-medium text-accent">{displayValue}</span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          id={sliderId}
          value={value}
          className={`
            w-full h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer
            accent-accent
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';
