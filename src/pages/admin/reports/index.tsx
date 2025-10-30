import * as React from "react";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type ReportCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  iconBgColor: string;
  iconColor: string;
};

const ReportCard = ({
  icon: Icon,
  title,
  description,
  href,
  iconBgColor,
  iconColor,
}: ReportCardProps) => {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
      >
        {/* Icon */}
        <div className="mb-4 flex items-center justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBgColor}`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>

        {/* Content */}
        <div>
          <h3 className="mb-2 text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
      </motion.div>
    </Link>
  );
};

export default function AdminReports() {
  const reports: ReportCardProps[] = [
    {
      icon: FileText,
      title: "Sales Report",
      description:
        "Comprehensive view of all sales transactions with detailed breakdowns by voucher type, retailer, and time period.",
      href: "/admin/reports/sales",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    // {
    //   icon: TrendingUp,
    //   title: "Earnings Summary",
    //   description:
    //     "Overview of platform commissions, agent commissions, and retailer earnings with trend analysis.",
    //   href: "/admin/reports/earnings",
    //   iconBgColor: "bg-green-100 dark:bg-green-900/20",
    //   iconColor: "text-green-600 dark:text-green-400",
    // },
    // {
    //   icon: Inbox,
    //   title: "Inventory Report",
    //   description:
    //     "Current stock levels, popular vouchers, and inventory valuation across all voucher categories.",
    //   href: "/admin/reports/inventory",
    //   iconBgColor: "bg-amber-100 dark:bg-amber-900/20",
    //   iconColor: "text-amber-600 dark:text-amber-400",
    // },
    // {
    //   icon: CreditCard,
    //   title: "Voucher Performance",
    //   description:
    //     "Analysis of voucher sales performance, including popularity, margin, and turnover rate by provider.",
    //   href: "/admin/reports/vouchers",
    //   iconBgColor: "bg-purple-100 dark:bg-purple-900/20",
    //   iconColor: "text-purple-600 dark:text-purple-400",
    // },
    // {
    //   icon: Users,
    //   title: "Agent Performance",
    //   description:
    //     "Detailed breakdown of agent performance, retailer acquisition, and commission earnings over time.",
    //   href: "/admin/reports/agents",
    //   iconBgColor: "bg-pink-100 dark:bg-pink-900/20",
    //   iconColor: "text-pink-600 dark:text-pink-400",
    // },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Reports
        </h1>
        <p className="text-muted-foreground">
          Access detailed reports and analytics about your business.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <ReportCard
            key={report.title}
            icon={report.icon}
            title={report.title}
            description={report.description}
            href={report.href}
            iconBgColor={report.iconBgColor}
            iconColor={report.iconColor}
          />
        ))}
      </div>

      {/* Recently Generated Reports Section - Placeholder */}
      {/* <div className="mt-8 rounded-lg border border-border p-6">
        <h2 className="mb-4 text-lg font-medium">Recently Generated Reports</h2>
        <div className="rounded-md bg-muted/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No recently generated reports. Generate a report to see it here.
          </p>
        </div>
      </div> */}
    </div>
  );
}
