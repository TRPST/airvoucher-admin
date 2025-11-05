import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/utils/formatCurrency";

export type SalesDataPoint = {
  date: string;
  amount: number;
  formattedDate?: string;
};

type SalesOverTimeChartProps = {
  data: SalesDataPoint[];
  isLoading?: boolean;
  height?: number;
};

export const SalesOverTimeChart: React.FC<SalesOverTimeChartProps> = ({
  data,
  isLoading = false,
  height = 280,
}) => {
  if (isLoading) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ height }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        <p>No sales data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-md">
      <h2 className="text-lg pl-4 pt-4 font-semibold mb-4 text-foreground">Sales Over Time</h2>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            stroke="var(--text-muted)"
            axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--text-muted)"
            tickFormatter={(value) => `R ${value}`}
            axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [
              formatCurrency(value),
              "Sales",
            ]}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              backgroundColor: "var(--tooltip-bg)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--tooltip-text)",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
              padding: "8px 12px"
            }}
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          />
          <Bar
            dataKey="amount"
            name="Voucher Sales"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={24}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
