import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Check } from "lucide-react";
import { cn } from "@/utils/cn";
import { useToast } from "@/components/ToastProvider";
import {
  fetchDepositFeeConfigurations,
  updateDepositFeeConfiguration,
  type DepositFeeConfiguration,
  type DepositMethod,
  type FeeType,
} from "@/actions";

type DepositMethodConfig = {
  method: DepositMethod;
  label: string;
  description: string;
};

const depositMethods: DepositMethodConfig[] = [
  {
    method: "EFT",
    label: "EFT",
    description: "Electronic Funds Transfer",
  },
  {
    method: "ATM",
    label: "ATM",
    description: "Automated Teller Machine Deposit",
  },
  {
    method: "Counter",
    label: "Counter",
    description: "Bank Counter Deposit",
  },
  {
    method: "Branch",
    label: "Branch",
    description: "Branch Deposit",
  },
];

export default function DepositFeeSettings() {
  const [configs, setConfigs] = React.useState<DepositFeeConfiguration[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { success, error: showError } = useToast();

  // Load deposit fee configurations
  React.useEffect(() => {
    async function loadConfigs() {
      setIsLoading(true);
      const { data, error } = await fetchDepositFeeConfigurations();

      if (error) {
        showError(`Failed to load deposit fee configurations: ${error.message}`);
      } else if (data) {
        setConfigs(data);
      }

      setIsLoading(false);
    }

    loadConfigs();
  }, [showError]);

  const handleSave = async (method: DepositMethod, feeType: FeeType, feeValue: number) => {
    try {
      const { error } = await updateDepositFeeConfiguration(method, feeType, feeValue);

      if (error) {
        showError(`Failed to update ${method} fee: ${error.message}`);
        return false;
      } else {
        success(`${method} deposit fee updated successfully`);
        
        // Refresh configurations
        const { data } = await fetchDepositFeeConfigurations();
        if (data) {
          setConfigs(data);
        }
        return true;
      }
    } catch (err) {
      showError(`Error updating ${method} fee: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link href="/admin/settings">
        <button className="inline-flex items-center text-sm font-medium hover:text-primary transition-colors group">
          <ChevronLeft className="mr-2 h-5 w-5 transition-transform duration-200 transform group-hover:-translate-x-1" />
          Back to Settings
        </button>
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Deposit Fee Settings</h1>
        <p className="text-muted-foreground">
          Configure fees for different deposit methods used when processing retailer deposits.
        </p>
      </div>

      {/* Compact Table Layout */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Deposit Method</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fee Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fee Amount</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {depositMethods.map((methodConfig) => {
                const config = configs.find((c) => c.deposit_method === methodConfig.method);
                return (
                  <DepositMethodRow
                    key={methodConfig.method}
                    methodConfig={methodConfig}
                    config={config}
                    onSave={handleSave}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-border">
          {depositMethods.map((methodConfig) => {
            const config = configs.find((c) => c.deposit_method === methodConfig.method);
            return (
              <DepositMethodMobileRow
                key={methodConfig.method}
                methodConfig={methodConfig}
                config={config}
                onSave={handleSave}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type DepositMethodRowProps = {
  methodConfig: DepositMethodConfig;
  config?: DepositFeeConfiguration;
  onSave: (method: DepositMethod, feeType: FeeType, feeValue: number) => Promise<boolean>;
};

function DepositMethodRow({ methodConfig, config, onSave }: DepositMethodRowProps) {
  const [feeType, setFeeType] = React.useState<FeeType>(config?.fee_type || "fixed");
  const [feeValue, setFeeValue] = React.useState<string>(config?.fee_value.toString() || "0");
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  // Update local state when config changes
  React.useEffect(() => {
    if (config) {
      setFeeType(config.fee_type);
      setFeeValue(config.fee_value.toString());
      setHasChanges(false);
    }
  }, [config]);

  const handleFeeTypeChange = (newType: FeeType) => {
    setFeeType(newType);
    setHasChanges(true);
    setShowSaved(false);
  };

  const handleFeeValueChange = (value: string) => {
    setFeeValue(value);
    setHasChanges(true);
    setShowSaved(false);
  };

  const handleSubmit = async () => {
    const numValue = parseFloat(feeValue);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    setIsSaving(true);
    const success = await onSave(methodConfig.method, feeType, numValue);
    setIsSaving(false);

    if (success) {
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Deposit Method */}
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-sm">{methodConfig.label}</div>
          <div className="text-xs text-muted-foreground">{methodConfig.description}</div>
        </div>
      </td>

      {/* Fee Type Toggle */}
      <td className="px-4 py-3">
        <div className="inline-flex rounded-md border border-input bg-background p-0.5">
          <button
            type="button"
            onClick={() => handleFeeTypeChange("fixed")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded transition-colors",
              feeType === "fixed"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            Fixed
          </button>
          <button
            type="button"
            onClick={() => handleFeeTypeChange("percentage")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded transition-colors",
              feeType === "percentage"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            Percentage
          </button>
        </div>
      </td>

      {/* Fee Amount Input */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">
            {feeType === "fixed" ? "R" : "%"}
          </span>
          <input
            type="number"
            value={feeValue}
            onChange={(e) => handleFeeValueChange(e.target.value)}
            min="0"
            step={feeType === "fixed" ? "0.01" : "0.1"}
            className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
            placeholder={feeType === "fixed" ? "0.00" : "0.0"}
          />
        </div>
      </td>

      {/* Action Button */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {showSaved && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={!hasChanges || isSaving}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              hasChanges && !isSaving
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                Saving
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

function DepositMethodMobileRow({ methodConfig, config, onSave }: DepositMethodRowProps) {
  const [feeType, setFeeType] = React.useState<FeeType>(config?.fee_type || "fixed");
  const [feeValue, setFeeValue] = React.useState<string>(config?.fee_value.toString() || "0");
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  React.useEffect(() => {
    if (config) {
      setFeeType(config.fee_type);
      setFeeValue(config.fee_value.toString());
      setHasChanges(false);
    }
  }, [config]);

  const handleFeeTypeChange = (newType: FeeType) => {
    setFeeType(newType);
    setHasChanges(true);
    setShowSaved(false);
  };

  const handleFeeValueChange = (value: string) => {
    setFeeValue(value);
    setHasChanges(true);
    setShowSaved(false);
  };

  const handleSubmit = async () => {
    const numValue = parseFloat(feeValue);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    setIsSaving(true);
    const success = await onSave(methodConfig.method, feeType, numValue);
    setIsSaving(false);

    if (success) {
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Method Name */}
      <div>
        <div className="font-medium text-sm">{methodConfig.label}</div>
        <div className="text-xs text-muted-foreground">{methodConfig.description}</div>
      </div>

      {/* Fee Type Toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Fee Type</label>
        <div className="inline-flex rounded-md border border-input bg-background p-0.5 w-full">
          <button
            type="button"
            onClick={() => handleFeeTypeChange("fixed")}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors",
              feeType === "fixed"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            Fixed
          </button>
          <button
            type="button"
            onClick={() => handleFeeTypeChange("percentage")}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors",
              feeType === "percentage"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            Percentage
          </button>
        </div>
      </div>

      {/* Fee Amount */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Fee Amount</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {feeType === "fixed" ? "R" : "%"}
          </span>
          <input
            type="number"
            value={feeValue}
            onChange={(e) => handleFeeValueChange(e.target.value)}
            min="0"
            step={feeType === "fixed" ? "0.01" : "0.1"}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            placeholder={feeType === "fixed" ? "0.00" : "0.0"}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        {showSaved && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
        <button
          onClick={handleSubmit}
          disabled={!hasChanges || isSaving}
          className={cn(
            "ml-auto px-4 py-1.5 text-xs font-medium rounded-md transition-colors",
            hasChanges && !isSaving
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
              Saving
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </div>
  );
}
