'use client';

import React, { forwardRef, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { motionTransitions } from '../../lib/motion-tokens';

export interface DrawCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  /** Indeterminate visual state */
  indeterminate?: boolean;
}

/**
 * DrawCheckbox: the tick draws itself when the box is ticked. The box is 20px,
 * the tap area is 40px. Checked fill is the signal green, the tick is the ink
 * that sits on it. Calm, exact, no bounce.
 */
export const DrawCheckbox = forwardRef<HTMLInputElement, DrawCheckboxProps>(
  (
    {
      className,
      label,
      description,
      checked,
      defaultChecked,
      disabled,
      indeterminate = false,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [isChecked, setIsChecked] = useState(defaultChecked || false);

    const isControlled = checked !== undefined;
    const currentChecked = isControlled ? checked : isChecked;
    const showCheck = currentChecked || indeterminate;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setIsChecked(e.target.checked);
      onChange?.(e);
    };

    return (
      <div
        className={cn(
          'flex items-center gap-2.5 select-none',
          disabled && 'cursor-not-allowed opacity-40',
          className
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={currentChecked}
            disabled={disabled}
            onChange={handleChange}
            className="peer sr-only"
            {...props}
          />

          <motion.div
            onClick={() => {
              if (disabled) return;
              const input = document.getElementById(inputId) as HTMLInputElement | null;
              input?.click();
            }}
            initial={false}
            animate={{ scale: showCheck ? [0.94, 1] : 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative flex size-5 items-center justify-center rounded-[6px] border',
              'cursor-pointer transition-colors duration-(--dur-micro) ease-(--ease-out)',
              'active:brightness-[0.97]',
              "after:absolute after:-inset-2.5 after:content-['']",
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
              'peer-disabled:cursor-not-allowed',
              showCheck
                ? 'border-signal bg-signal text-signal-ink'
                : 'border-rule bg-surface text-ink',
              disabled && 'cursor-not-allowed'
            )}
          >
            {/* Path-draw checkmark */}
            {currentChecked && !indeterminate && (
              <motion.svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-current"
                initial={{ pathLength: 0, scale: 0.85, opacity: 0 }}
                animate={{ pathLength: 1, scale: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.22, ease: [0.65, 0, 0.35, 1] },
                  scale: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.12 },
                }}
              >
                <motion.path
                  d="M3.5 8.5 L6.5 11.5 L12.5 5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.22, ease: [0.65, 0, 0.35, 1] }}
                />
              </motion.svg>
            )}

            {/* Indeterminate: a centered bar that draws from left to right */}
            {indeterminate && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={motionTransitions.springSnappy}
                style={{ transformOrigin: 'left center' }}
                className="h-[2px] w-2.5 rounded-full bg-signal-ink"
              />
            )}
          </motion.div>
        </div>

        {(label || description) && (
          <label
            htmlFor={inputId}
            className={cn('cursor-pointer text-left', disabled && 'cursor-not-allowed')}
          >
            {label && (
              <div className="text-xs leading-tight font-medium text-ink">
                {label}
              </div>
            )}
            {description && (
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </div>
            )}
          </label>
        )}
      </div>
    );
  }
);

DrawCheckbox.displayName = 'DrawCheckbox';
