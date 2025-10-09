import React from 'react';
import useSWR from 'swr';
import {
  retailersFetcher,
  salesReportFetcher,
  earningsSummaryFetcher,
} from '@/lib/swr/fetchers';
import { SwrKeys } from '@/lib/swr/keys';
import type { Retailer, SalesReport } from '@/actions/adminActions';

interface UseDashboardDataReturn {
  retailers: Retailer[];
  todaySales: SalesReport[];
  salesData30Days: SalesReport[];
  platformCommission: number;
  isDataLoading: boolean; // background revalidation/loading
  isPrimed: boolean;      // true once cache has initial data
  error: string | null;
}

export function useDashboardData(isAuthLoading: boolean): UseDashboardDataReturn {
  // Stable end-of-day timestamp so SWR keys remain consistent within a day
  const endOfTodayISO = React.useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);

  // Stable date ranges
  const { todayStr, thirtyDaysAgoStr } = React.useMemo(() => {
    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirty = thirtyDaysAgo.toISOString().split('T')[0];

    return { todayStr: today, thirtyDaysAgoStr: thirty };
  }, []);

  // Always provide keys so SWR can return cached data instantly across navigations
  const retailersKey = SwrKeys.retailers();
  const todaySalesKey = SwrKeys.salesReport(todayStr, endOfTodayISO);
  const sales30Key = SwrKeys.salesReport(thirtyDaysAgoStr, endOfTodayISO);
  const earningsKey = SwrKeys.earningsSummary(todayStr, endOfTodayISO);

  // SWR hooks
  const {
    data: retailersData,
    error: retailersError,
    isLoading: retailersLoading,
  } = useSWR(retailersKey, retailersFetcher);

  const {
    data: todaySalesData,
    error: todaySalesError,
    isLoading: todaySalesLoading,
  } = useSWR(todaySalesKey, salesReportFetcher);

  const {
    data: salesData30DaysData,
    error: sales30Error,
    isLoading: sales30Loading,
  } = useSWR(sales30Key, salesReportFetcher);

  const {
    data: earningsData,
    error: earningsError,
    isLoading: earningsLoading,
  } = useSWR(earningsKey, earningsSummaryFetcher);

  // Background (re)loading indicator only, do not block UI when cache is primed
  const isDataLoading =
    retailersLoading || todaySalesLoading || sales30Loading || earningsLoading;

  // Consider cache primed once all datasets have resolved at least once
  const isPrimed =
    retailersData !== undefined &&
    todaySalesData !== undefined &&
    salesData30DaysData !== undefined &&
    earningsData !== undefined;

  const error =
    (retailersError as any)?.message ||
    (todaySalesError as any)?.message ||
    (sales30Error as any)?.message ||
    (earningsError as any)?.message ||
    null;

  const retailers = (retailersData as Retailer[]) || [];
  const todaySales = (todaySalesData as SalesReport[]) || [];
  const salesData30Days = (salesData30DaysData as SalesReport[]) || [];

  const platformCommission =
    (earningsData || []).reduce((sum: number, item: any) => sum + (item.platform_commission || 0), 0) || 0;

  return {
    retailers,
    todaySales,
    salesData30Days,
    platformCommission,
    isDataLoading,
    isPrimed,
    error,
  };
}
