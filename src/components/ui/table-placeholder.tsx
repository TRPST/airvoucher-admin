"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";

const tablePlaceholderVariants = cva(
  "w-full max-h-full rounded-lg border border-border bg-card shadow-sm animate-fade-in flex flex-col"
);

export interface TablePlaceholderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  columns: string[];
  rows?: number;
  loading?: boolean;
  emptyMessage?: string;
  data?: Array<Record<string, React.ReactNode>>;
  rowsClickable?: boolean;
}

export function TablePlaceholder({
  className,
  columns,
  rows = 5,
  loading = false,
  emptyMessage = "No data available",
  data,
  rowsClickable = false,
  ...props
}: TablePlaceholderProps) {
  const renderRows = () => {
    if (loading) {
      return Array(rows)
        .fill(0)
        .map((_, index) => (
          <tr
            key={`loading-row-${index}`}
            className="animate-pulse border-b border-border"
          >
            {columns.map((col, colIndex) => (
              <td
                key={`loading-cell-${index}-${colIndex}`}
                className="px-4 py-3 whitespace-nowrap"
              >
                <div className="h-4 rounded-md bg-muted-foreground/20"></div>
              </td>
            ))}
          </tr>
        ));
    }

    if (data && data.length > 0) {
      return data.map((row, index) => (
        <tr
          key={`row-${index}`}
          className={cn(
            "border-b border-border hover:bg-muted/30 transition-colors",
            rowsClickable && "cursor-pointer"
          )}
        >
          {columns.map((col, colIndex) => (
            <td
              key={`cell-${index}-${colIndex}`}
              className="px-4 py-3 text-sm whitespace-nowrap"
            >
              {row[col] || "-"}
            </td>
          ))}
        </tr>
      ));
    }

    return (
      <tr>
        <td
          colSpan={columns.length}
          className="px-4 py-6 text-center text-muted-foreground whitespace-nowrap"
        >
          {emptyMessage}
        </td>
      </tr>
    );
  };

  return (
    <div
      className={cn(tablePlaceholderVariants(), className)}
      {...props}
    >
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-card text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            {columns.map((column, index) => (
              <th
                key={`header-${index}`}
                className="whitespace-nowrap px-4 py-3"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
          <tbody className="divide-y divide-border">{renderRows()}</tbody>
        </table>
      </div>
    </div>
  );
}
