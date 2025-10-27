import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
  RetailerProfileCard,
  FinancialOverview,
  TerminalsSection,
  SalesHistorySection,
  AddTerminalModal,
  CommissionGroupModal,
  SalesAgentModal,
  DepositModal,
  CreditLimitModal,
  DepositHistoryModal,
  RetailerUpdateModal,
} from "@/components/admin/retailers";

import {
  fetchRetailers,
  fetchAdminTerminals,
  fetchSalesReport,
  type AdminRetailer,
  type AdminTerminal,
  type SalesReport,
} from "@/actions";

export default function RetailerDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [expandedSection, setExpandedSection] = useState<string | null>("terminals");

  // State for data and loading
  const [retailer, setRetailer] = useState<AdminRetailer | null>(null);
  const [terminals, setTerminals] = useState<AdminTerminal[]>([]);
  const [sales, setSales] = useState<SalesReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddTerminalModal, setShowAddTerminalModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);
  const [showDepositHistoryModal, setShowDepositHistoryModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Load retailer data
  useEffect(() => {
    async function loadRetailerData() {
      if (typeof id !== "string") return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch retailer info
        const { data: retailersData, error: retailerError } = await fetchRetailers();

        if (retailerError) {
          throw new Error(`Failed to load retailer: ${retailerError.message}`);
        }

        const foundRetailer = retailersData?.find((r) => r.id === id) || null;
        if (!foundRetailer) {
          throw new Error("Retailer not found");
        }

        setRetailer(foundRetailer);

        // Fetch terminals
        const { data: terminalsData, error: terminalsError } = await fetchAdminTerminals(id);

        if (terminalsError) {
          console.error("Error loading terminals:", terminalsError);
        } else {
          setTerminals(terminalsData || []);
        }

        // Fetch sales
        const { data: salesData, error: salesError } = await fetchSalesReport({});

        if (salesError) {
          console.error("Error loading sales:", salesError);
        } else {
          // Filter sales for this retailer
          const retailerSales =
            salesData?.filter((sale) => sale.retailer_name === foundRetailer.name) || [];
          setSales(retailerSales);
        }
      } catch (err) {
        console.error("Error in retailer details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load retailer data"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadRetailerData();
  }, [id]);

  // Handler functions
  const handleRetailerUpdate = (updatedRetailer: AdminRetailer) => {
    setRetailer(updatedRetailer);
  };

  const handleTerminalsUpdate = (updatedTerminals: AdminTerminal[]) => {
    setTerminals(updatedTerminals);
  };

  const handleTerminalAdded = async () => {
    // Refresh terminals list
    if (typeof id === "string") {
      const { data: terminalsData } = await fetchAdminTerminals(id);
      if (terminalsData) {
        setTerminals(terminalsData);
      }
    }
    setShowAddTerminalModal(false);
  };

  const handleCommissionGroupUpdate = (
    commissionGroupId: string | undefined,
    commissionGroupName: string | undefined
  ) => {
    if (retailer) {
      setRetailer({
        ...retailer,
        commission_group_id: commissionGroupId,
        commission_group_name: commissionGroupName,
      });
    }
  };

  const handleAgentUpdate = (
    agentId: string | undefined,
    agentName: string | undefined
  ) => {
    if (retailer) {
      setRetailer({
        ...retailer,
        agent_profile_id: agentId,
        agent_name: agentName,
      });
    }
  };

  const handleBalanceUpdate = (newBalance: number) => {
    if (retailer) {
      setRetailer({
        ...retailer,
        balance: newBalance,
      });
    }
  };

  const handleCreditLimitUpdate = (newCreditLimit: number) => {
    if (retailer) {
      setRetailer({
        ...retailer,
        credit_limit: newCreditLimit,
      });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} />;
  }

  // Not found state
  if (!retailer) {
    return <NotFoundState />;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/retailers">
        <button className="inline-flex items-center text-sm font-medium hover:text-primary transition-colors group">
          <ChevronLeft className="mr-2 h-5 w-5 transition-transform duration-200 transform group-hover:-translate-x-1" />
          Back to retailers
        </button>
      </Link>
      
      <div style={{ marginTop: 10 }} className="flex items-center justify-between">
        <div className="flex-col items-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Retailer Details
          </h1>
          <p className="text-muted-foreground">
            View and manage retailer information.
          </p>
        </div>
        <button
          onClick={() => setShowUpdateModal(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Update
        </button>

      </div>

      

      {/* Profile Card */}
      <RetailerProfileCard
        retailer={retailer}
        onCommissionGroupClick={() => setShowCommissionModal(true)}
        onAgentClick={() => setShowAgentModal(true)}
      />

      {/* Financial Overview */}
      <FinancialOverview
        retailer={retailer}
        onDepositClick={() => setShowDepositModal(true)}
        onCreditLimitClick={() => setShowCreditLimitModal(true)}
        onDepositHistoryClick={() => setShowDepositHistoryModal(true)}
      />

      {/* Expandable Sections */}
      <div className="space-y-4">
        {/* Terminals Section */}
        <TerminalsSection
          retailerId={typeof id === "string" ? id : ""}
          terminals={terminals}
          onTerminalsUpdate={handleTerminalsUpdate}
          isExpanded={expandedSection === "terminals"}
          onToggle={() => toggleSection("terminals")}
          onAddTerminal={() => setShowAddTerminalModal(true)}
        />

        {/* Sales History Section */}
        <SalesHistorySection
          sales={sales}
          isExpanded={expandedSection === "sales"}
          onToggle={() => toggleSection("sales")}
        />
      </div>

      {/* Modals */}
      <AddTerminalModal
        isOpen={showAddTerminalModal}
        onClose={() => setShowAddTerminalModal(false)}
        retailerId={typeof id === "string" ? id : ""}
        onTerminalAdded={handleTerminalAdded}
      />

      <CommissionGroupModal
        isOpen={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        retailer={retailer}
        onUpdate={handleCommissionGroupUpdate}
      />

      <SalesAgentModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        retailer={retailer}
        onUpdate={handleAgentUpdate}
      />

      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        retailer={retailer}
        onUpdate={handleBalanceUpdate}
      />

      <CreditLimitModal
        isOpen={showCreditLimitModal}
        onClose={() => setShowCreditLimitModal(false)}
        retailer={retailer}
        onUpdate={handleCreditLimitUpdate}
      />

      <DepositHistoryModal
        isOpen={showDepositHistoryModal}
        onClose={() => setShowDepositHistoryModal(false)}
        retailer={retailer}
      />

      <RetailerUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        retailer={retailer}
        onUpdated={handleRetailerUpdate}
      />
    </div>
  );
}
