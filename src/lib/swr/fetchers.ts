import {
  fetchCommissionGroupsWithCounts,
  fetchCommissionGroupById,
  fetchCommissionGroups,
  fetchVoucherTypes,
  getVoucherAmountsForType,
  getVoucherCommissionOverridesForType,
  fetchRetailers,
  fetchAllAgents,
  fetchSalesReport,
  fetchEarningsSummary,
  fetchUnassignedRetailers,
} from '@/actions';
import { fetchNetworkVoucherSummaries } from '@/actions/adminActions';
import type { CommissionGroupWithCounts, CommissionGroup } from '@/actions';
import type {
  CommissionGroupKey,
  VoucherTypesKey,
  VoucherAmountsKey,
  CommissionOverridesKey,
  RetailersKey,
  AgentsKey,
  SalesReportKey,
  EarningsSummaryKey,
} from './keys';
import type { NetworkVoucherSummary, VoucherTypeSummary } from '@/actions/adminActions';

// Fetch list of commission groups with counts
export async function commissionGroupsWithCountsFetcher(): Promise<CommissionGroupWithCounts[]> {
  const { data, error } = await fetchCommissionGroupsWithCounts();
  if (error) throw error;
  return data ?? [];
}

// Fetch all commission groups with their rates
export async function commissionGroupsFetcher(): Promise<CommissionGroup[]> {
  const { data, error } = await fetchCommissionGroups();
  if (error) throw error;
  return data ?? [];
}

// Fetch a single commission group by id (SWR v2 array-key signature)
export async function commissionGroupByIdFetcher([_k, groupId]: CommissionGroupKey) {
  const { data, error } = await fetchCommissionGroupById(groupId);
  if (error) throw error;
  if (!data) throw new Error('Commission group not found');
  return data;
}

/** Fetch voucher types; params.activeOnly === false means include inactive */
export async function voucherTypesFetcher([_k, scope]: VoucherTypesKey) {
  // scope: 'active' | 'all'
  const includeInactive = scope === 'all';
  const { data, error } = await fetchVoucherTypes(includeInactive);
  if (error) throw error;
  return data ?? [];
}

/** Fetch voucher amounts for a given voucher type */
export async function voucherAmountsFetcher([_k, voucherTypeId]: VoucherAmountsKey) {
  const { data, error } = await getVoucherAmountsForType(voucherTypeId);
  if (error) throw error;
  return data ?? [];
}

/** Fetch commission overrides for a given group and voucher type */
export async function commissionOverridesFetcher([_k, groupId, voucherTypeId]: CommissionOverridesKey) {
  const { data, error } = await getVoucherCommissionOverridesForType(voucherTypeId, groupId);
  if (error) throw error;
  return data ?? [];
}

/** Lists: Retailers */
export async function retailersFetcher(): Promise<any[]> {
  const { data, error } = await fetchRetailers();
  if (error) throw error;
  return data ?? [];
}

/** Lists: Agents */
export async function agentsFetcher(): Promise<any[]> {
  const { data, error } = await fetchAllAgents();
  if (error) throw error;
  return data ?? [];
}

/** Sales Report for a date range */
export async function salesReportFetcher([_k, startDate, endDate]: SalesReportKey) {
  const { data, error } = await fetchSalesReport({ startDate, endDate });
  if (error) throw error;
  return data ?? [];
}

/** Earnings Summary for a date range */
export async function earningsSummaryFetcher([_k, startDate, endDate]: EarningsSummaryKey) {
  const { data, error } = await fetchEarningsSummary({ startDate, endDate });
  if (error) throw error;
  return data ?? [];
}

/** Unassigned Retailers for agent assignment */
export async function unassignedRetailersFetcher(): Promise<any[]> {
  const { data, error } = await fetchUnassignedRetailers();
  if (error) throw error;
  return data ?? [];
}

/** Network voucher summaries (vouchers dashboard) */
export async function networkVoucherSummariesFetcher(): Promise<{
  networks: NetworkVoucherSummary[];
  other: VoucherTypeSummary[];
  billPayments: VoucherTypeSummary[];
}> {
  const { data, error } = await fetchNetworkVoucherSummaries();
  if (error) throw error;
  // data expected format: { networks, other, billPayments }
  return data ?? { networks: [], other: [], billPayments: [] };
}
