import { Smartphone, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { AdminTerminal } from "@/actions";

interface TerminalsCardProps {
  terminals: AdminTerminal[];
  onClick: () => void;
}

export function TerminalsCard({ terminals, onClick }: TerminalsCardProps) {
  const activeCount = terminals.filter((t) => t.status === "active").length;
  const inactiveCount = terminals.length - activeCount;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 text-left w-full"
    >
      {/* Icon and Chevron */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
          <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      {/* Content */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-lg font-semibold">Terminals</h3>
          <span className="inline-flex items-center rounded-full bg-blue-600/10 dark:bg-blue-400/10 px-2.5 py-0.5 text-sm font-semibold text-blue-700 dark:text-blue-300">
            {terminals.length}
          </span>
        </div>
        
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {terminals.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <span>Active</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {activeCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Inactive</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {inactiveCount}
                </span>
              </div>
            </>
          ) : (
            <p>No terminals registered</p>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.button>
  );
}
