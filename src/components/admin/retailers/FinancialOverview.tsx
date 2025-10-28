import { DollarSign, CreditCard, Percent, History } from "lucide-react";
import { StatsTile } from "@/components/ui/stats-tile";
import type { FinancialOverviewProps } from "./types";

export function FinancialOverview({ 
  retailer, 
  onDepositClick, 
  onCreditLimitClick,
  onDepositHistoryClick 
}: FinancialOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-medium">Financial Overview</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onDepositClick}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted"
            title="Process deposit"
          >
            Update Balance
          </button>
          <button
            onClick={onCreditLimitClick}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted"
            title="Update credit limit"
          >
            Update Credit
          </button>
          <button
            onClick={onDepositHistoryClick}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-1"
            title="View balance history"
          >
            <History className="h-4 w-4" />
            Balance History
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsTile
          label="Available Balance"
          value={`R ${retailer.balance.toFixed(2)}`}
          icon={DollarSign}
          intent="success"
          subtitle="Current account balance"
        />
        <StatsTile
          label="Credit Limit"
          value={`R ${retailer.credit_limit.toFixed(2)}`}
          icon={CreditCard}
          intent="warning"
          subtitle={`Balance can go to -R ${retailer.credit_limit.toFixed(2)}`}
        />
        <StatsTile
          label="Commission Earned"
          value={`R ${retailer.commission_balance.toFixed(2)}`}
          icon={Percent}
          intent="info"
          subtitle="Total earned to date"
        />
      </div>
    </div>
  );
}
