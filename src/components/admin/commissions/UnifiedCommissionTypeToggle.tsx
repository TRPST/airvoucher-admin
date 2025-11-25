import * as React from 'react';
import { cn } from '@/utils/cn';
import type { CommissionType } from '@/actions';

interface UnifiedCommissionTypeToggleProps {
  value: CommissionType;
  onChange: (type: CommissionType) => void;
  disabled?: boolean;
  label?: string;
}

export function UnifiedCommissionTypeToggle({
  value,
  onChange,
  disabled = false,
  label = 'Commission Type',
}: UnifiedCommissionTypeToggleProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="inline-flex w-full rounded-md border border-input bg-background p-0.5">
        <button
          type="button"
          onClick={() => !disabled && onChange('fixed')}
          disabled={disabled}
          className={cn(
            'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors',
            value === 'fixed' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          Fixed (Rand)
        </button>
        <button
          type="button"
          onClick={() => !disabled && onChange('percentage')}
          disabled={disabled}
          className={cn(
            'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors',
            value === 'percentage'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-muted',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          Percentage (%)
        </button>
      </div>
    </div>
  );
}
