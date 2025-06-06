import { motion } from 'framer-motion';

interface SalesFilterPanelProps {
  voucherTypeFilter: string;
  setVoucherTypeFilter: (value: string) => void;
  retailerNameFilter: string;
  setRetailerNameFilter: (value: string) => void;
  voucherTypes: string[];
  retailerNames: string[];
}

export function SalesFilterPanel({
  voucherTypeFilter,
  setVoucherTypeFilter,
  retailerNameFilter,
  setRetailerNameFilter,
  voucherTypes,
  retailerNames,
}: SalesFilterPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="mb-3 font-medium">Filter Options</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="voucherTypeFilter" className="mb-1 block text-sm font-medium">
            Voucher Type
          </label>
          <select
            id="voucherTypeFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={voucherTypeFilter}
            onChange={e => setVoucherTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {voucherTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="retailerNameFilter" className="mb-1 block text-sm font-medium">
            Retailer
          </label>
          <select
            id="retailerNameFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={retailerNameFilter}
            onChange={e => setRetailerNameFilter(e.target.value)}
          >
            <option value="all">All Retailers</option>
            {retailerNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}
