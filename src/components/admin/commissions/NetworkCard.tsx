import * as React from 'react';
import { useRouter } from 'next/router';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

type NetworkCardProps = {
  provider: 'mtn' | 'vodacom' | 'cellc' | 'telkom';
  groupId: string;
  index?: number;
};

const networkConfig = {
  mtn: {
    name: 'MTN',
    logo: '/assets/vouchers/mtn-logo.jpg',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  vodacom: {
    name: 'Vodacom',
    logo: '/assets/vouchers/vodacom-logo.png',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
  },
  cellc: {
    name: 'Cell C',
    logo: '/assets/vouchers/cellc-logo.png',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
  },
  telkom: {
    name: 'Telkom',
    logo: '/assets/vouchers/telkom-logo.png',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
  },
};

export function NetworkCard({ provider, groupId, index = 0 }: NetworkCardProps) {
  const router = useRouter();
  const config = networkConfig[provider];

  const handleClick = React.useCallback(() => {
    router.push(`/admin/commissions/${groupId}/networks/${provider}`);
  }, [router, groupId, provider]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={handleClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
    >
      {/* Logo and Arrow */}
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg',
            config.bgColor
          )}
        >
          <img src={config.logo} alt={config.name} className="h-full w-full object-cover" />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      {/* Network Name */}
      <div>
        <h3 className="text-xl font-semibold">{config.name}</h3>
        <p className="text-sm text-muted-foreground">Manage commission rates</p>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}
