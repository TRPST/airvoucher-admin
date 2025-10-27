import * as React from "react";
import Link from "next/link";
import { DollarSign, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type SettingsCard = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  iconBgColor: string;
  iconColor: string;
};

const settingsCards: SettingsCard[] = [
  {
    title: "Deposit Fee Settings",
    description: "Configure fees for different deposit methods (EFT, ATM, Counter, Branch)",
    icon: DollarSign,
    href: "/admin/settings/deposit-fee",
    iconBgColor: "bg-green-100 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-400",
  },
  // Add more settings categories here as needed
];

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">
          Manage system-wide configurations and settings.
        </p>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card, index) => (
          <Link key={card.href} href={card.href}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
            >
              {/* Icon */}
              <div className="mb-4 flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.iconBgColor}`}
                >
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>

              {/* Content */}
              <div>
                <h3 className="mb-2 text-lg font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Empty State Message (if only one card) */}
      {settingsCards.length === 1 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>More settings options will be added here in the future.</p>
        </div>
      )}
    </div>
  );
}
