import * as React from "react";
import { useRouter } from "next/router";
import { type CommissionGroupWithCounts } from "@/actions";

interface CommissionGroupsTableProps {
  groups: CommissionGroupWithCounts[];
}

export function CommissionGroupsTable({ groups }: CommissionGroupsTableProps) {
  const router = useRouter();

  const formattedDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const handleRowClick = (groupId: string) => {
    router.push(`/admin/commissions/${groupId}`);
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
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={group.id}
                onClick={() => handleRowClick(group.id)}
                className="border-b border-border cursor-pointer transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{group.name}</div>
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
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No commission groups found. Create your first group to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
