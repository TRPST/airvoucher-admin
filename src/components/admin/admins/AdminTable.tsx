import * as React from 'react';
import { Shield, ShieldCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import { TablePlaceholder } from '@/components/ui/table-placeholder';
import { cn } from '@/utils/cn';
import type { AdminUser } from '@/actions/types/adminTypes';

interface AdminTableProps {
  admins: AdminUser[];
}

export function AdminTable({ admins }: AdminTableProps) {
  const dateFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    []
  );

  // Format data for the table
  const tableData = admins.map(admin => {
    const formattedUpdatedAt = admin.updated_at
      ? dateFormatter.format(new Date(admin.updated_at))
      : '—';

    const row = {
      Admin: (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {admin.is_super_admin ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="font-medium">{admin.full_name}</div>
          </div>
        </div>
      ),
      Email: admin.email,
      Type: admin.is_super_admin ? (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Super Admin
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
          <Shield className="mr-1 h-3 w-3" />
          Admin
        </span>
      ),
      Permissions: admin.is_super_admin ? (
        <span className="text-primary">All Permissions</span>
      ) : (
        <span>
          {admin.permissions.length} permission
          {admin.permissions.length !== 1 ? 's' : ''}
        </span>
      ),
      Status: (
        <div
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            admin.status === 'active'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400'
          )}
        >
          {admin.status === 'active' ? 'Active' : 'Inactive'}
        </div>
      ),
      Updated: (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formattedUpdatedAt}</span>
        </div>
      ),
    };

    // Wrap each row in a Link component
    return Object.entries(row).reduce(
      (acc, [key, value]) => {
        acc[key] = (
          <Link
            href={`/admin/admins/${admin.id}`}
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
      columns={['Admin', 'Email', 'Type', 'Permissions', 'Status', 'Updated']}
      data={tableData}
      rowsClickable={true}
      className="h-full"
    />
  );
}
