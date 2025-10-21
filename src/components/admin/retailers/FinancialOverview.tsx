import { DollarSign, CreditCard, Percent } from "lucide-react";
import { StatsTile } from "@/components/ui/stats-tile";
import type { FinancialOverviewProps } from "./types";

export function FinancialOverview({ retailer, onBalanceUpdate }: FinancialOverviewProps) {
  const handleUpdateBalances = () => {
    // This will be handled by the parent component which will open the modal
    // We just need to trigger the callback with current values to pre-populate
    onBalanceUpdate(retailer.balance, retailer.credit_limit);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Financial Overview</h3>
        <button
          onClick={handleUpdateBalances}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted"
          title="Update balances"
        >
          Update Balances
        </button>
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
