export const SwrKeys = {
  // Commissions
  commissionGroupsWithCounts: () => ['commissionGroupsWithCounts'] as const,
  commissionGroups: () => ['commissionGroups'] as const,
  commissionGroup: (groupId: string) => ['commissionGroup', groupId] as const,
  voucherTypes: (scope: 'active' | 'all' = 'active') => ['voucherTypes', scope] as const,
  voucherAmounts: (voucherTypeId: string) => ['voucherAmounts', voucherTypeId] as const,
  commissionOverrides: (groupId: string, voucherTypeId: string) =>
    ['commissionOverrides', groupId, voucherTypeId] as const,

  // Dashboard
  retailers: () => ['retailers'] as const,
  salesReport: (startDate: string, endDate: string) => ['salesReport', startDate, endDate] as const,
  earningsSummary: (startDate: string, endDate: string) => ['earningsSummary', startDate, endDate] as const,

  // Retailers/Agents
  agents: () => ['agents'] as const,
  commissionGroupsSimple: () => ['commissionGroupsSimple'] as const,
  unassignedRetailers: () => ['unassignedRetailers'] as const,

  // Vouchers
  networkVoucherSummaries: () => ['networkVoucherSummaries'] as const,
};

export type CommissionGroupKey = ReturnType<typeof SwrKeys.commissionGroup>;
export type VoucherTypesKey = ReturnType<typeof SwrKeys.voucherTypes>;
export type VoucherAmountsKey = ReturnType<typeof SwrKeys.voucherAmounts>;
export type CommissionOverridesKey = ReturnType<typeof SwrKeys.commissionOverrides>;

// Dashboard keys
export type SalesReportKey = ReturnType<typeof SwrKeys.salesReport>;
export type EarningsSummaryKey = ReturnType<typeof SwrKeys.earningsSummary>;

// Lists
export type RetailersKey = ReturnType<typeof SwrKeys.retailers>;
export type AgentsKey = ReturnType<typeof SwrKeys.agents>;
export type CommissionGroupsSimpleKey = ReturnType<typeof SwrKeys.commissionGroupsSimple>;
export type UnassignedRetailersKey = ReturnType<typeof SwrKeys.unassignedRetailers>;
export type NetworkVoucherSummariesKey = ReturnType<typeof SwrKeys.networkVoucherSummaries>;
