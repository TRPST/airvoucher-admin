import * as React from "react";
import Link from "next/link";
import { Trash2, ExternalLink } from "lucide-react";
import { archiveCommissionGroup, type CommissionGroupWithCounts } from "@/actions";
import { ArchiveCommissionGroupDialog } from "./ArchiveCommissionGroupDialog";
import { cn } from "@/utils/cn";

interface CommissionGroupsTableProps {
  groups: CommissionGroupWithCounts[];
  onArchive?: () => void; // callback to trigger a refresh in parent
}

export function CommissionGroupsTable({ groups, onArchive }: CommissionGroupsTableProps) {
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [dialogOpenForId, setDialogOpenForId] = React.useState<string | null>(null);

  const openArchiveDialog = (groupId: string) => setDialogOpenForId(groupId);
  const closeArchiveDialog = () => setDialogOpenForId(null);

  const currentGroup = React.useMemo(
    () => groups.find((g) => g.id === dialogOpenForId) || null,
    [dialogOpenForId, groups]
  );

  const formattedDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const handleConfirmArchive = async () => {
    if (!dialogOpenForId) return;
    setIsArchiving(true);
    try {
      const { error } = await archiveCommissionGroup(dialogOpenForId);
      if (error) {
        console.error("Error archiving commission group:", error);
        // optional: toast
        return;
      }
      closeArchiveDialog();
      onArchive?.();
    } catch (err) {
      console.error("Error archiving commission group:", err);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">Group</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                Description
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                Retailers
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                Sales Agents
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                Created
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={group.id}
                className="border-b border-border transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/commissions/${group.id}`}
                      className="font-medium hover:underline"
                    >
                      {group.name}
                    </Link>
                    <Link
                      href={`/admin/commissions/${group.id}`}
                      className="text-muted-foreground hover:text-foreground"
                      title="Manage Commission Rates"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {group.description || "No description provided"}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{group.retailer_count.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{group.agent_count.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">{formattedDate(group.created_at)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/commissions/${group.id}`}
                      className={cn(
                        "inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                      title="Manage Commission Rates"
                    >
                      Manage Rates
                    </Link>
                    <button
                      onClick={() => openArchiveDialog(group.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
                        "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20"
                      )}
                      title="Archive commission group"
                    >
                      <Trash2 className="h-4 w-4" />
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No commission groups found. Create your first group to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Archive confirmation dialog */}
      <ArchiveCommissionGroupDialog
        isOpen={!!dialogOpenForId}
        onClose={closeArchiveDialog}
        onConfirm={handleConfirmArchive}
        groupName={currentGroup?.name || ""}
        isLoading={isArchiving}
      />
    </div>
  );
}
