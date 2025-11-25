import * as React from 'react';
import { cn } from '@/utils/cn';
import type { CommissionType } from '@/actions';

interface CommissionInputGroupProps {
  label: string;
  value: number | string;
  commissionType: CommissionType;
  voucherAmount?: number;
  onChange: (value: string) => void;
  onTypeChange: (type: CommissionType) => void;
  disabled?: boolean;
  showCalculated?: boolean;
  highlightColor?: string;
  hideTypeToggle?: boolean; // New prop to hide individual toggle when using unified mode
}

export function CommissionInputGroup({
  label,
  value,
  commissionType,
  voucherAmount = 0,
  onChange,
  onTypeChange,
  disabled = false,
  showCalculated = true,
  highlightColor,
  hideTypeToggle = false,
}: CommissionInputGroupProps) {
  // Calculate the actual amount
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const calculatedAmount = commissionType === 'fixed' ? numValue : voucherAmount * (numValue / 100);

  // Format value for display in input
  const displayValue =
    typeof value === 'string'
      ? value
      : commissionType === 'fixed'
        ? value.toFixed(2)
        : (value * 100).toFixed(2);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>

      {/* Type Toggle - only show if hideTypeToggle is false */}
      {!hideTypeToggle && (
        <div className="inline-flex w-full rounded-md border border-input bg-background p-0.5">
          <button
            type="button"
            onClick={() => !disabled && onTypeChange('fixed')}
            disabled={disabled}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              commissionType === 'fixed' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            Fixed
          </button>
          <button
            type="button"
            onClick={() => !disabled && onTypeChange('percentage')}
            disabled={disabled}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              commissionType === 'percentage'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            %
          </button>
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <input
          type="number"
          min="0"
          max={commissionType === 'percentage' ? '100' : undefined}
          step="0.01"
          value={displayValue}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full rounded-md border border-input bg-background px-2.5 py-1.5 pr-8 text-sm',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            highlightColor
          )}
          placeholder="0.00"
        />
        <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
          {commissionType === 'fixed' ? 'R' : '%'}
        </div>
      </div>

      {/* Calculated Amount */}
      {showCalculated && voucherAmount > 0 && (
        <div className="text-xs text-muted-foreground">= R {calculatedAmount.toFixed(2)}</div>
      )}
    </div>
  );
}
