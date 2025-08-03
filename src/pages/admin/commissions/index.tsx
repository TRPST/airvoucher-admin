import * as React from "react";
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import {
  fetchCommissionGroupsWithCounts,
  fetchVoucherTypes,
  createCommissionGroup,
  createCommissionRates,
  type CommissionGroupWithCounts,
} from "@/actions";

import { CommissionGroupOverviewCard } from "@/components/admin/commissions/CommissionGroupOverviewCard";
import { AddCommissionDialog } from "@/components/admin/commissions/AddCommissionDialog";
import { categorizeVoucherTypes, type VoucherTypeCategory } from "@/components/admin/commissions/utils";

export default function AdminCommissions() {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [commissionGroups, setCommissionGroups] = React.useState<
    CommissionGroupWithCounts[]
  >([]);
  const [voucherTypes, setVoucherTypes] = React.useState<
    {id: string; name: string; supplier_commission_pct?: number}[]
  >([]);
  const [categorizedVoucherTypes, setCategorizedVoucherTypes] = React.useState<
    VoucherTypeCategory[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  
  // Form state for adding a new commission group
  const [formData, setFormData] = React.useState({
    groupName: "",
    description: "",
    rates: {} as Record<string, {retailerPct: number, agentPct: number, supplierPct: number}>,
  });

  // Fetch commission groups and voucher types
  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        // Fetch commission groups with counts
        const { data, error: fetchError } = await fetchCommissionGroupsWithCounts();

        if (fetchError) {
          throw new Error(
            `Failed to load commission groups: ${fetchError.message}`
          );
        }

        if (!data) {
          throw new Error("No data returned from fetchCommissionGroupsWithCounts");
        }

        setCommissionGroups(data);
        
        // Fetch voucher types
        const { data: voucherTypesData, error: voucherTypesError } = await fetchVoucherTypes();
        
        if (voucherTypesError) {
          console.error("Error loading voucher types:", voucherTypesError);
          // Continue loading the page even if voucher types fail to load
        } else {
          const types = voucherTypesData || [];
          setVoucherTypes(types);
          
          // Categorize voucher types
          const categorized = categorizeVoucherTypes(types);
          setCategorizedVoucherTypes(categorized);
        }
      } catch (err) {
        console.error("Error loading commission data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load commission groups"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  
  // Handle form input changes
  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle rate input changes in the form
  const handleRateInputChange = (voucherTypeId: string, value: string, rateType: 'retailer' | 'agent' | 'supplier') => {
    // Get the voucher type to access its supplier commission
    const voucherType = voucherTypes.find(vt => vt.id === voucherTypeId);
    const defaultSupplierPct = voucherType?.supplier_commission_pct || 0;
    
    // Use -1 as a special placeholder for empty values during editing
    if (value === '') {
      setFormData((prev) => {
        const existingRates = prev.rates[voucherTypeId] || { 
          retailerPct: 5, 
          agentPct: 0, 
          supplierPct: defaultSupplierPct 
        };
        
        return {
          ...prev,
          rates: {
            ...prev.rates,
            [voucherTypeId]: {
              ...existingRates,
              [rateType === 'retailer' ? 'retailerPct' : rateType === 'agent' ? 'agentPct' : 'supplierPct']: -1
            },
          },
        };
      });
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    // Check if input has more than 2 decimal places
    if (value.includes('.') && value.split('.')[1].length > 2) return;
    
    // Clamp between 0-100 without any decimal manipulation
    const clampedValue = Math.min(100, Math.max(0, numValue));
    
    setFormData((prev) => {
      // Get existing rates for this voucher type or initialize defaults
      const existingRates = prev.rates[voucherTypeId] || { 
        retailerPct: 5, 
        agentPct: 0, 
        supplierPct: defaultSupplierPct 
      };
      
      return {
        ...prev,
        rates: {
          ...prev.rates,
          [voucherTypeId]: {
            ...existingRates,
            [rateType === 'retailer' ? 'retailerPct' : rateType === 'agent' ? 'agentPct' : 'supplierPct']: clampedValue
          },
        },
      };
    });
  };
  
  // Reset form data
  const resetFormData = () => {
    setFormData({
      groupName: "",
      description: "",
      rates: {},
    });
    setFormError(null);
  };
  
  // Create new commission group
  const handleCreateGroup = async () => {
    // Validate form
    if (!formData.groupName.trim()) {
      setFormError("Please enter a group name");
      return;
    }
    
    setIsCreating(true);
    setFormError(null);
    
    try {
      // Step 1: Create the commission group
      const { data: groupData, error: groupError } = await createCommissionGroup(
        formData.groupName,
        formData.description
      );
      
      if (groupError) {
        throw new Error(`Failed to create commission group: ${groupError.message}`);
      }
      
      const groupId = groupData?.id;
      if (!groupId) {
        throw new Error("Failed to get the new group ID");
      }
      
      // Step 2: Create commission rates for all voucher types
      const rates = voucherTypes.map(type => {
        // Get rates from form data or use defaults (including supplier commission from voucher_types)
        const defaultSupplierPct = type.supplier_commission_pct || 0;
        const rateData = formData.rates[type.id] || { 
          retailerPct: 5, 
          agentPct: 0, 
          supplierPct: defaultSupplierPct 
        };
        
        // Handle -1 values (treat as 0) and convert to appropriate format
        // Retailer and agent are stored as decimals (divide by 100)
        // Supplier is stored as whole number (no division)
        const retailerPct = rateData.retailerPct === -1 ? 0 : Number((rateData.retailerPct / 100));
        const agentPct = rateData.agentPct === -1 ? 0 : Number((rateData.agentPct / 100));
        const supplierPct = rateData.supplierPct === -1 ? 0 : Number(rateData.supplierPct);
        
        return {
          commission_group_id: groupId,
          voucher_type_id: type.id,
          retailer_pct: retailerPct,
          agent_pct: agentPct,
          supplier_pct: supplierPct,
        };
      });
      
      if (rates.length > 0) {
        const { error: ratesError } = await createCommissionRates(rates);
        
        if (ratesError) {
          throw new Error(`Failed to create commission rates: ${ratesError.message}`);
        }
      }
      
      // Step 3: Refresh the commission groups list
      const { data: refreshedData } = await fetchCommissionGroupsWithCounts();
      if (refreshedData) {
        setCommissionGroups(refreshedData);
      }
      
      // Step 4: Close dialog and reset form
      setShowAddDialog(false);
      resetFormData();
      
    } catch (err) {
      console.error("Error creating commission group:", err);
      setFormError(
        err instanceof Error ? err.message : "Failed to create commission group"
      );
    } finally {
      setIsCreating(false);
    }
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Loading commission groups...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">Error</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Commission Groups</h1>
          <p className="text-muted-foreground">
            Manage commission rates for retailers and sales agents across different voucher types.
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Group
        </button>
      </div>
      
      {/* Commission Groups Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {commissionGroups.map((group) => (
          <CommissionGroupOverviewCard key={group.id} group={group} />
        ))}

        {commissionGroups.length === 0 && (
          <div className="col-span-full rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No commission groups found. Create your first group to get started.
            </p>
          </div>
        )}
      </div>

      <AddCommissionDialog
        showAddDialog={showAddDialog}
        setShowAddDialog={setShowAddDialog}
        formError={formError}
        formData={formData}
        handleFormInputChange={handleFormInputChange}
        handleRateInputChange={handleRateInputChange}
        handleCreateGroup={handleCreateGroup}
        resetFormData={resetFormData}
        isCreating={isCreating}
        categorizedVoucherTypes={categorizedVoucherTypes}
      />
    </div>
  );
}
