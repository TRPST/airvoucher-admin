import { Store, Clock } from "lucide-react";
import { cn } from "@/utils/cn";
import type { RetailerDetailsProps } from "./types";

interface RetailerProfileCardProps {
  retailer: RetailerDetailsProps["retailer"];
  onCommissionGroupClick: () => void;
  onAgentClick: () => void;
}

export function RetailerProfileCard({ 
  retailer, 
  onCommissionGroupClick, 
  onAgentClick 
}: RetailerProfileCardProps) {
  const lastUpdated = retailer.updated_at
    ? new Intl.DateTimeFormat('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(retailer.updated_at))
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary md:h-20 md:w-20">
          <Store className="h-8 w-8 md:h-10 md:w-10" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <h2 className="text-xl font-bold md:text-2xl">{retailer.name}</h2>
            {retailer.short_code && (
              <span className="inline-flex items-center gap-1 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                RETAILER ID: {retailer.short_code}
              </span>
            )}
          </div>
          {lastUpdated && (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last updated {lastUpdated}</span>
            </div>
          )}
          <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-2 text-sm md:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Contact Person:</span>
              <span className="font-medium">
                {retailer.contact_name || retailer.full_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Contact Email:</span>
              <span className="font-medium">
                {retailer.contact_email || retailer.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Second Contact:</span>
              <span className="font-medium">
                {retailer.secondary_contact_name || "Not provided"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium">
                {retailer.location || "Not provided"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  retailer.status === "active"
                    ? "bg-green-500/10 text-green-500"
                    : retailer.status === "inactive"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {retailer.status.charAt(0).toUpperCase() +
                  retailer.status.slice(1)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Sales Agent:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {retailer.agent_name || "None"}
                </span>
                {/* <button
                  onClick={onAgentClick}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-muted"
                  title="Change sales agent"
                >
                  Change
                </button> */}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Commission Group:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {retailer.commission_group_name || "None"}
                </span>
                {/* <button
                  onClick={onCommissionGroupClick}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-muted"
                  title="Change commission group"
                >
                  Change
                </button> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
