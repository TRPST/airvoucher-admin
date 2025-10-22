/**
 * This file serves as a facade that re-exports all admin-related functionality
 * from the smaller, more focused modules.
 */

// Re-export all types
export * from './types/adminTypes';

// Re-export retailer actions
export {
  fetchRetailers,
  createRetailer,
  updateRetailer,
  updateRetailerBalance,
  fetchAgents,
} from './admin/retailerActions';

// Re-export agent actions
export {
  fetchAgents as fetchAllAgents,
  fetchAgentById,
  updateAgent,
  fetchAgentRetailers,
  createAgent,
  assignRetailerToAgent,
  unassignRetailerFromAgent,
  fetchUnassignedRetailers,
} from './admin/agentActions';

// Re-export terminal actions
export { fetchTerminals, createTerminal, createTerminalWithUser, updateTerminal } from './admin/terminalActions';

// Re-export voucher actions
export {
  fetchVoucherInventory,
  uploadVouchers,
  disableVoucher,
  fetchVoucherTypeSummaries,
  fetchVoucherType,
  updateSupplierCommission,
  fetchVoucherTypes,
  fetchVoucherTypesByNetwork,
  fetchVoucherTypesByNetworkAndCategory,
  fetchVoucherTypesByNetworkCategoryAndDuration,
  fetchNetworkVoucherSummaries,
  fetchNetworkCategoryStats,
  fetchNetworkCategoryDurationStats,
} from './admin/voucherActions';
export type { VoucherTypeSummary, CategoryStats } from './admin/voucherActions';

// Re-export voucher file upload actions
export { processVoucherFile } from './admin/voucherFileActions';

// Re-export commission actions
export {
  fetchCommissionGroups,
  upsertCommissionRate,
  createCommissionGroup,
  createCommissionRates,
} from './admin/commissionActions';

// Re-export commission group actions
export {
  fetchCommissionGroupsWithCounts,
  fetchCommissionGroupById,
  archiveCommissionGroup,
  updateCommissionGroup,
} from './admin/commissionGroupActions';
export type { CommissionGroupWithCounts } from './admin/commissionGroupActions';

// Re-export report actions
export {
  fetchSalesReport,
  fetchEarningsSummary,
  fetchInventoryReport,
} from './admin/reportActions';
