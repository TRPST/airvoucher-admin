import { Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { SalesReport } from "@/actions";

interface SalesHistoryCardProps {
  sales: SalesReport[];
  onClick: () => void;
}

export function SalesHistoryCard({ sales, onClick }: SalesHistoryCardProps) {
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCommission = sales.reduce((sum, sale) => sum + sale.retailer_commission, 0);

  // Get most recent sale date
  const mostRecentSale = sales.length > 0 
    ? new Date(sales[0].created_at).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 text-left w-full"
    >
      {/* Icon and Chevron */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
          <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      {/* Content */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-lg font-semibold">Sales History</h3>
          <span className="inline-flex items-center rounded-full bg-purple-600/10 dark:bg-purple-400/10 px-2.5 py-0.5 text-sm font-semibold text-purple-700 dark:text-purple-300">
            {sales.length}
          </span>
        </div>
        
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {sales.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <span>Total Sales</span>
                <span className="font-semibold text-foreground">
                  R {totalSales.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Commission</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  R {totalCommission.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Sale</span>
                <span className="font-medium text-foreground">
                  {mostRecentSale}
                </span>
              </div>
            </>
          ) : (
            <p>No sales recorded yet</p>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.button>
  );
}
