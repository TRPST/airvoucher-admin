import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/utils/formatCurrency";

export type VoucherTypeSales = {
  name: string;
  value: number;
  percent?: number;
};

type SalesByVoucherTypeChartProps = {
  data: VoucherTypeSales[];
  isLoading?: boolean;
  height?: number;
};

// Predefined colors for the pie chart segments
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#6366f1", // indigo
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#a855f7", // purple
];

export const SalesByVoucherTypeChart: React.FC<SalesByVoucherTypeChartProps> = ({
  data,
  isLoading = false,
  height = 280,
}) => {
  const [textColor, setTextColor] = useState("#333");

  // Detect theme and set appropriate text color
  useEffect(() => {
    const updateTextColor = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTextColor(isDark ? "#fff" : "#333");
    };

    updateTextColor();
    
    // Listen for theme changes
    const observer = new MutationObserver(updateTextColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

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

  // Calculate percentages for each category
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercent = data.map((item) => ({
    ...item,
    percent: Math.round((item.value / total) * 100),
  }));

  // Custom label component with better positioning and visibility
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant enough (>5%)
    if (percent < 5) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill={textColor}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12px"
        fontWeight="600"
        style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))' }}
      >
        {`${percent}%`}
      </text>
    );
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Sales by Voucher Type</h2>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={dataWithPercent}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              innerRadius={30}
              dataKey="value"
              nameKey="name"
            >
              {dataWithPercent.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name,
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                color: "hsl(var(--card-foreground))",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                padding: "8px 12px"
              }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              iconSize={8}
              wrapperStyle={{ 
                paddingTop: "10px",
                color: "hsl(var(--card-foreground))"
              }}
              formatter={(value, entry: any) => {
                const item = dataWithPercent.find(d => d.name === value);
                return (
                  <span style={{ color: textColor, fontSize: "14px" }}>
                    {value}: {item?.percent}%
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
