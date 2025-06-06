import {
  SalesOverTimeChart,
  type SalesDataPoint,
} from '@/components/admin/charts/SalesOverTimeChart';
import {
  SalesByVoucherTypeChart,
  type VoucherTypeSales,
} from '@/components/admin/charts/SalesByVoucherTypeChart';

interface DashboardChartsProps {
  timeSeriesData: SalesDataPoint[];
  voucherTypeData: VoucherTypeSales[];
  isLoading: boolean;
}

export function DashboardCharts({
  timeSeriesData,
  voucherTypeData,
  isLoading,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <SalesOverTimeChart data={timeSeriesData} isLoading={isLoading} />
      <SalesByVoucherTypeChart data={voucherTypeData} isLoading={isLoading} />
    </div>
  );
}
