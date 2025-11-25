import * as React from 'react';
import { type CommissionType } from '@/actions';
import { cn } from '@/utils/cn';

interface CompactCommissionTypeToggleProps {
  value: CommissionType;
  onChange: (value: CommissionType) => void;
  disabled?: boolean;
}

export function CompactCommissionTypeToggle({
  value,
  onChange,
  disabled = false,
}: CompactCommissionTypeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={() => onChange('percentage')}
        disabled={disabled}
        className={cn(
          'px-2 py-1 text-xs font-medium transition-colors',
          'border-r border-border',
          'disabled:cursor-not-allowed disabled:opacity-50',
          value === 'percentage' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
      >
        %
      </button>
      <button
        type="button"
        onClick={() => onChange('fixed')}
        disabled={disabled}
        className={cn(
          'px-2 py-1 text-xs font-medium transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          value === 'fixed' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
      >
        R
      </button>
    </div>
  );
}
