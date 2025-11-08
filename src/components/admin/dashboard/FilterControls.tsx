import { cn } from '@/utils/cn';

type QuickFilter = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';

interface FilterControlsProps {
  // Date filters
  startDate: string;
  endDate: string;
  quickFilter: QuickFilter;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  
  // Dropdown filters
  voucherTypeFilter: string;
  retailerFilter: string;
  retailerShortCodeFilter: string;
  agentFilter: string;
  commissionGroupFilter: string;
  terminalFilter: string;
  onVoucherTypeFilterChange: (value: string) => void;
  onRetailerFilterChange: (value: string) => void;
  onRetailerShortCodeFilterChange: (value: string) => void;
  onAgentFilterChange: (value: string) => void;
  onCommissionGroupFilterChange: (value: string) => void;
  onTerminalFilterChange: (value: string) => void;
  
  // Filter options
  voucherTypes: string[];
  retailers: string[];
  retailerShortCodes: string[];
  agents: string[];
  commissionGroups: string[];
  terminals: string[];
  
  // Total count
  totalSales: number;
}

export function FilterControls({
  startDate,
  endDate,
  quickFilter,
  onStartDateChange,
  onEndDateChange,
  onQuickFilterChange,
  voucherTypeFilter,
  retailerFilter,
  retailerShortCodeFilter,
  agentFilter,
  commissionGroupFilter,
  terminalFilter,
  onVoucherTypeFilterChange,
  onRetailerFilterChange,
  onRetailerShortCodeFilterChange,
  onAgentFilterChange,
  onCommissionGroupFilterChange,
  onTerminalFilterChange,
  voucherTypes,
  retailers,
  retailerShortCodes,
  agents,
  commissionGroups,
  terminals,
  totalSales,
}: FilterControlsProps) {
  return (
    <div className="space-y-4 rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sales Filters</h3>
        <p className="text-sm text-muted-foreground">{totalSales} total sales</p>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onQuickFilterChange('all')}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            quickFilter === 'all'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          All Time
        </button>
        <button
          onClick={() => onQuickFilterChange('today')}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            quickFilter === 'today'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Today
        </button>
        <button
          onClick={() => onQuickFilterChange('week')}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            quickFilter === 'week'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          This Week
        </button>
        <button
          onClick={() => onQuickFilterChange('month')}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            quickFilter === 'month'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          This Month
        </button>
        <button
          onClick={() => onQuickFilterChange('lastMonth')}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            quickFilter === 'lastMonth'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Last Month
        </button>
        <button
          onClick={() => onQuickFilterChange('year')}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            quickFilter === 'year'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          This Year
        </button>
        <input
          type="date"
          className="rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
        <input
          type="date"
          className="rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="w-28 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={voucherTypeFilter}
          onChange={(e) => onVoucherTypeFilterChange(e.target.value)}
        >
          <option value="all">All Types</option>
          {voucherTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          className="w-32 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={retailerShortCodeFilter}
          onChange={(e) => onRetailerShortCodeFilterChange(e.target.value)}
        >
          <option value="all">All Retailer IDs</option>
          {retailerShortCodes.map((shortCode) => (
            <option key={shortCode} value={shortCode}>
              {shortCode}
            </option>
          ))}
        </select>

        <select
          className="w-32 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={retailerFilter}
          onChange={(e) => onRetailerFilterChange(e.target.value)}
        >
          <option value="all">All Retailers</option>
          {retailers.map((retailer) => (
            <option key={retailer} value={retailer}>
              {retailer}
            </option>
          ))}
        </select>

        <select
          className="w-28 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={agentFilter}
          onChange={(e) => onAgentFilterChange(e.target.value)}
        >
          <option value="all">All Agents</option>
          {agents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        <select
          className="w-28 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={commissionGroupFilter}
          onChange={(e) => onCommissionGroupFilterChange(e.target.value)}
        >
          <option value="all">All Groups</option>
          {commissionGroups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>

        <select
          className="w-32 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={terminalFilter}
          onChange={(e) => onTerminalFilterChange(e.target.value)}
        >
          <option value="all">All Terminals</option>
          {terminals.map((terminal) => (
            <option key={terminal} value={terminal}>
              {terminal}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
