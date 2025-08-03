import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface AddCommissionDialogProps {
  showAddDialog: boolean;
  setShowAddDialog: (show: boolean) => void;
  formError: string | null;
  formData: {
    groupName: string;
    description: string;
    rates: Record<string, {retailerPct: number, agentPct: number, supplierPct: number}>;
  };
  handleFormInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRateInputChange: (voucherTypeId: string, value: string, rateType: 'retailer' | 'agent' | 'supplier') => void;
  handleCreateGroup: () => void;
  resetFormData: () => void;
  isCreating: boolean;
  categorizedVoucherTypes: {
    category: string;
    types: { id: string; name: string; supplier_commission_pct?: number }[];
  }[];
}

export function AddCommissionDialog({
  showAddDialog,
  setShowAddDialog,
  formError,
  formData,
  handleFormInputChange,
  handleRateInputChange,
  handleCreateGroup,
  resetFormData,
  isCreating,
  categorizedVoucherTypes,
}: AddCommissionDialogProps) {
  if (!showAddDialog) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={() => setShowAddDialog(false)}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-4 sm:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Commission Group</h2>
          <button
            onClick={() => setShowAddDialog(false)}
            className="rounded-full p-2 hover:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {formError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {formError}
              </div>
            </div>
          )}
        
          <div className="space-y-1">
            <label className="text-sm font-medium">Group Name</label>
            <input
              type="text"
              name="groupName"
              value={formData.groupName}
              onChange={handleFormInputChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g., Premium, Standard, etc."
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleFormInputChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Brief description of this group"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Commission Rates</label>
            
            {categorizedVoucherTypes.length > 0 ? (
              categorizedVoucherTypes.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h3 className="text-xs font-medium uppercase text-muted-foreground border-b pb-1">
                    {category.category}
                  </h3>
                  <div className="space-y-3">
                    {category.types.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center space-x-2"
                      >
                        <span className="text-sm flex-grow truncate sm:overflow-visible min-w-0" title={type.name}>{type.name}</span>
                        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                          {/* Supplier Commission */}
                          <div className="flex flex-col text-right">
                            <span className="text-xs text-muted-foreground mb-1">Supplier</span>
                            <div className="relative w-16 sm:w-20">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={(() => {
                                  const storedValue = (formData.rates[type.id]?.supplierPct) ?? (type.supplier_commission_pct || 0);
                                  if (storedValue === -1) return '';
                                  // Allow free-form typing without forcing decimal formatting
                                  return storedValue.toFixed(0);
                                })()}
                                onChange={(e) => handleRateInputChange(type.id, e.target.value, 'supplier')}
                                className="w-full rounded-md border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 pl-1 sm:pl-2 pr-4 sm:pr-5 py-1 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-1 sm:right-2 flex items-center text-xs text-orange-500 dark:text-orange-400">
                                %
                              </div>
                            </div>
                          </div>

                          {/* Retailer Commission */}
                          <div className="flex flex-col text-right">
                            <span className="text-xs text-muted-foreground mb-1">Retailer</span>
                            <div className="relative w-20 sm:w-20">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={(() => {
                                  const storedValue = (formData.rates[type.id]?.retailerPct) ?? 5;
                                  if (storedValue === -1) return '';
                                  // Allow free-form typing without forcing decimal formatting
                                  return storedValue.toFixed(0);
                                })()}
                                onChange={(e) => handleRateInputChange(type.id, e.target.value, 'retailer')}
                                className="w-full rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 pl-1 sm:pl-2 pr-4 sm:pr-5 py-1 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-1 sm:right-2 flex items-center text-xs text-muted-foreground">
                                %
                              </div>
                            </div>
                          </div>
                          
                          {/* Agent Commission */}
                          <div className="flex flex-col text-right">
                            <span className="text-xs text-muted-foreground mb-1">Agent</span>
                            <div className="relative w-16 sm:w-20">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={(() => {
                                  const storedValue = (formData.rates[type.id]?.agentPct) ?? 0;
                                  if (storedValue === -1) return '';
                                  // Allow free-form typing without forcing decimal formatting
                                  return storedValue.toFixed(0);
                                })()}
                                onChange={(e) => handleRateInputChange(type.id, e.target.value, 'agent')}
                                className="w-full rounded-md border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 pl-1 sm:pl-2 pr-4 sm:pr-5 py-1 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-1 sm:right-2 flex items-center text-xs text-green-500 dark:text-green-400">
                                %
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-sm text-muted-foreground">
                Loading voucher types...
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddDialog(false);
                resetFormData();
              }}
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium border border-input hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              type="button"
              disabled={isCreating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
