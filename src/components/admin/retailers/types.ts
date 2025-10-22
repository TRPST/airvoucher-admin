import type { AdminRetailer, AdminTerminal, SalesReport, CommissionGroup } from "@/actions";

export interface RetailerDetailsProps {
  retailer: AdminRetailer;
  onRetailerUpdate: (updatedRetailer: AdminRetailer) => void;
}

export interface TerminalSectionProps {
  retailerId: string;
  terminals: AdminTerminal[];
  onTerminalsUpdate: (terminals: AdminTerminal[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
  onAddTerminal: () => void;
}

export interface SalesHistorySectionProps {
  sales: SalesReport[];
  isExpanded: boolean;
  onToggle: () => void;
}

export interface FinancialOverviewProps {
  retailer: AdminRetailer;
  onBalanceUpdate: (balance: number, creditLimit: number) => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AddTerminalModalProps extends ModalProps {
  retailerId: string;
  onTerminalAdded: () => void;
}

export interface EditTerminalModalProps extends ModalProps {
  terminal: AdminTerminal | null;
  onTerminalUpdated: (terminal: AdminTerminal) => void;
}

export interface CommissionGroupModalProps extends ModalProps {
  retailer: AdminRetailer;
  onUpdate: (commissionGroupId: string | undefined, commissionGroupName: string | undefined) => void;
}

export interface SalesAgentModalProps extends ModalProps {
  retailer: AdminRetailer;
  onUpdate: (agentId: string | undefined, agentName: string | undefined) => void;
}

export interface BalanceUpdateModalProps extends ModalProps {
  retailer: AdminRetailer;
  onUpdate: (balance: number, creditLimit: number) => void;
}
