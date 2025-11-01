import * as React from 'react';
import { useRouter } from 'next/router';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import Image from 'next/image';

type VoucherTypeCommissionCardProps = {
  voucherTypeId: string;
  voucherTypeName: string;
  supplierPct: number;
  retailerPct: number;
  agentPct: number;
  groupId: string;
  index?: number;
  networkProvider?: string;
  category?: string;
};

export function VoucherTypeCommissionCard({
  voucherTypeId,
  voucherTypeName,
  supplierPct,
  retailerPct,
  agentPct,
  groupId,
  index = 0,
  networkProvider,
  category,
}: VoucherTypeCommissionCardProps) {
  const router = useRouter();

  // Determine logo path and background color based on voucher type
  const { logoPath, iconBgColor } = React.useMemo(() => {
    const name = voucherTypeName.toLowerCase();
    
    // Network-based styling
    if (networkProvider) {
      switch (networkProvider) {
        case 'mtn':
          return {
            logoPath: '/assets/vouchers/mtn-logo.jpg',
            iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          };
        case 'cellc':
          return {
            logoPath: '/assets/vouchers/cellc-logo.png',
            iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
          };
        case 'vodacom':
          return {
            logoPath: '/assets/vouchers/vodacom-logo.png',
            iconBgColor: 'bg-red-100 dark:bg-red-900/20',
          };
        case 'telkom':
          return {
            logoPath: '/assets/vouchers/telkom-logo.png',
            iconBgColor: 'bg-purple-100 dark:bg-purple-900/20',
          };
      }
    }

    // Other voucher types by name
    if (name.includes('ringa')) {
      return {
        logoPath: '/assets/vouchers/ringas-logo.jpg',
        iconBgColor: 'bg-primary/10',
      };
    }
    if (name.includes('hollywood')) {
      return {
        logoPath: '/assets/vouchers/hollywoodbets-logo.jpg',
        iconBgColor: 'bg-amber-100 dark:bg-amber-900/20',
      };
    }
    if (name.includes('easyload')) {
      return {
        logoPath: '/assets/vouchers/easyload-logo.png',
        iconBgColor: 'bg-green-100 dark:bg-green-900/20',
      };
    }
    if (name.includes('ott')) {
      return {
        logoPath: '/assets/vouchers/ott-logo.png',
        iconBgColor: 'bg-orange-100 dark:bg-orange-900/20',
      };
    }

    // Default - no logo
    return {
      logoPath: null,
      iconBgColor: 'bg-gray-100 dark:bg-gray-900/20',
    };
  }, [voucherTypeName, networkProvider, category]);

  const handleClick = React.useCallback(() => {
    router.push(`/admin/commissions/${groupId}/voucher-type/${voucherTypeId}`);
  }, [router, groupId, voucherTypeId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={handleClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      {/* Logo and Arrow */}
      <div className="mb-3 flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden', iconBgColor)}>
          {logoPath ? (
            <img
              src={logoPath}
              alt={voucherTypeName}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="h-5 w-5 rounded bg-gray-300" />
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      {/* Voucher Type Name */}
      <div className="mb-3">
        <h3 className="text-base font-semibold">{voucherTypeName}</h3>
        <p className="text-xs text-muted-foreground">Click to manage rates</p>
      </div>

      {/* Commission Rates */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Supplier:</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {supplierPct.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Retailer:</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {(retailerPct * 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Agent:</span>
          <span className="font-medium text-purple-600 dark:text-purple-400">
            {(agentPct * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}
