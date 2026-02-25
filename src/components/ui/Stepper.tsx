'use client';

interface Step {
  id: number;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <li key={step.id} className="flex-1 relative">
              <div className="flex items-center">
                {index > 0 && (
                  <div
                    className={`flex-1 h-0.5 ${isCompleted || isCurrent ? 'bg-accent' : 'bg-border'
                      }`}
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={!isClickable}
                    className={`
                      relative flex items-center justify-center w-10 h-10 rounded-full
                      border-2 transition-colors duration-200
                      focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base
                      ${isCompleted
                        ? 'bg-accent border-accent text-bg-base'
                        : isCurrent
                          ? 'bg-bg-surface border-accent text-accent'
                          : 'bg-bg-surface border-border text-text-muted'
                      }
                      ${isClickable ? 'cursor-pointer hover:bg-accent/20' : 'cursor-default'}
                    `}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </button>
                  <span
                    className={`
                      absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap
                      ${isCurrent ? 'text-accent' : isCompleted ? 'text-text-primary' : 'text-text-muted'}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${isCompleted ? 'bg-accent' : 'bg-border'}`}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
