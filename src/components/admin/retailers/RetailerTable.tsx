import * as React from 'react';
import { Store } from 'lucide-react';
import Link from 'next/link';
import { TablePlaceholder } from '@/components/ui/table-placeholder';
import { cn } from '@/utils/cn';
import type { AdminRetailer } from '@/actions';

interface RetailerTableProps {
  retailers: AdminRetailer[];
}

export function RetailerTable({ retailers }: RetailerTableProps) {
  // Format data for the table
  const tableData = retailers.map(retailer => {
    const availableCredit = retailer.credit_limit - (retailer.credit_used || 0);

    const row = {
      Name: (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{retailer.name}</div>
            <div className="text-xs text-muted-foreground">{retailer.email}</div>
          </div>
        </div>
      ),
      Agent: retailer.agent_name || 'None',
      'Commission Group': retailer.commission_group_name || 'None',
      Balance: `R ${retailer.balance.toFixed(2)}`,
      'Available Credit': `R ${availableCredit.toFixed(2)}`,
      Status: (
        <div
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            retailer.status === 'active'
              ? 'bg-green-500/10 text-green-500'
              : retailer.status === 'inactive'
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-destructive/10 text-destructive'
          )}
        >
          {retailer.status.charAt(0).toUpperCase() + retailer.status.slice(1)}
        </div>
      ),
    };

    // Wrap each row in a Link component
    return Object.entries(row).reduce(
      (acc, [key, value]) => {
        acc[key] = (
          <Link
            href={`/admin/retailers/${retailer.id}`}
            className="cursor-pointer"
            style={{ display: 'block' }}
          >
            {value}
          </Link>
        );
        return acc;
      },
      {} as Record<string, React.ReactNode>
    );
  });

  return (
    <TablePlaceholder
      columns={['Name', 'Agent', 'Commission Group', 'Balance', 'Available Credit', 'Status']}
      data={tableData}
      rowsClickable={true}
      className="max-h-[80vh]"
    />
  );
}
