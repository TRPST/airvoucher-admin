import { Activity, DollarSign, Store, Users } from 'lucide-react';
import { StatsTile } from '@/components/ui/stats-tile';
import { StickyStatsHeader } from '@/components/admin/StickyStatsHeader';

interface DashboardStatsProps {
  todaySalesTotal: number;
  todaysProfit: number;
  activeRetailers: number;
  retailersTotal: number;
  agentsCount: number;
  todaySalesCount: number;
}

export function DashboardStats({
  todaySalesTotal,
  todaysProfit,
  activeRetailers,
  retailersTotal,
  agentsCount,
  todaySalesCount,
}: DashboardStatsProps) {
  return (
    <>
      {/* Mobile Sticky Stats Header */}
      <StickyStatsHeader
        todaySalesTotal={todaySalesTotal}
        todaysProfit={todaysProfit}
        activeRetailers={activeRetailers}
        agentsCount={agentsCount}
        todaySalesCount={todaySalesCount}
      />

      {/* Desktop Stats Grid */}
      <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 md:grid lg:grid-cols-4">
        <StatsTile
          label="Today's Sales"
          value={`R ${todaySalesTotal.toFixed(2)}`}
          icon={Activity}
          intent="primary"
          subtitle={`${todaySalesCount} transactions`}
        />
        <StatsTile
          label="Airvoucher Profit"
          value={`R ${todaysProfit.toFixed(2)}`}
          icon={DollarSign}
          intent="success"
          subtitle="From today's sales"
        />
        <StatsTile
          label="Active Retailers"
          value={activeRetailers}
          icon={Store}
          intent="info"
          subtitle={`${retailersTotal} total retailers`}
        />
        <StatsTile
          label="Agents"
          value={agentsCount}
          icon={Users}
          intent="warning"
          subtitle="Total agents assigned"
        />
      </div>
    </>
  );
}
