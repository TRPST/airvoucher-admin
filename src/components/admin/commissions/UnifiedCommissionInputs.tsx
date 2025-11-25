import * as React from 'react';
import { CommissionInputGroup } from './CommissionInputGroup';
import { UnifiedCommissionTypeToggle } from './UnifiedCommissionTypeToggle';
import type { CommissionType } from '@/actions';

interface UnifiedCommissionInputsProps {
  supplierValue: string;
  retailerValue: string;
  agentValue: string;
  commissionType: CommissionType;
  voucherAmount?: number;
  onSupplierChange: (value: string) => void;
  onRetailerChange: (value: string) => void;
  onAgentChange: (value: string) => void;
  onTypeChange: (type: CommissionType) => void;
  disabled?: boolean;
  showCalculated?: boolean;
}

export function UnifiedCommissionInputs({
  supplierValue,
  retailerValue,
  agentValue,
  commissionType,
  voucherAmount,
  onSupplierChange,
  onRetailerChange,
  onAgentChange,
  onTypeChange,
  disabled = false,
  showCalculated = true,
}: UnifiedCommissionInputsProps) {
  return (
    <div className="space-y-4">
      {/* Unified Type Toggle */}
      <UnifiedCommissionTypeToggle
        value={commissionType}
        onChange={onTypeChange}
        disabled={disabled}
      />

      {/* Commission Input Fields */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <CommissionInputGroup
          label="Supplier Commission"
          value={supplierValue}
          commissionType={commissionType}
          voucherAmount={voucherAmount}
          onChange={onSupplierChange}
          onTypeChange={onTypeChange}
          disabled={disabled}
          showCalculated={showCalculated}
          hideTypeToggle={true}
        />

        <CommissionInputGroup
          label="Retailer Commission"
          value={retailerValue}
          commissionType={commissionType}
          voucherAmount={voucherAmount}
          onChange={onRetailerChange}
          onTypeChange={onTypeChange}
          disabled={disabled}
          showCalculated={showCalculated}
          hideTypeToggle={true}
        />

        <CommissionInputGroup
          label="Agent Commission"
          value={agentValue}
          commissionType={commissionType}
          voucherAmount={voucherAmount}
          onChange={onAgentChange}
          onTypeChange={onTypeChange}
          disabled={disabled}
          showCalculated={showCalculated}
          hideTypeToggle={true}
        />
      </div>
    </div>
  );
}
