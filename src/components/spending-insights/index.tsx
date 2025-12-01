"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Expand, Trending } from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useWidgetState } from "@/src/use-widget-state";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { formatCurrency, formatPercent } from "@/src/utils/format";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import { cn } from "@/lib/utils/cn";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { WidgetLoadingSkeleton } from "@/src/components/shared/widget-loading-skeleton";

interface Category {
  category: string;
  amount: number;
  percentage: number;
}

interface ToolOutput extends Record<string, unknown> {
  totalSpent?: number;
  categoryCount?: number;
  dateRange?: { start: string; end: string };
  message?: string;
  error_message?: string;
  featureName?: string;
}

interface ToolMetadata {
  allCategories: Category[];
}

interface SpendingUIState extends Record<string, unknown> {
  selectedIndex: number | null;
}

// SDK Color Tokens mapping
const CATEGORY_COLORS = [
  { from: "var(--color-blue-500)", to: "var(--color-blue-600)", text: "text-info" },
  { from: "var(--color-purple-500)", to: "var(--color-purple-600)", text: "text-discovery" },
  { from: "var(--color-red-500)", to: "var(--color-red-600)", text: "text-danger" },
  { from: "var(--color-orange-500)", to: "var(--color-orange-600)", text: "text-warning" },
  { from: "var(--color-green-500)", to: "var(--color-green-600)", text: "text-success" },
  { from: "var(--color-yellow-500)", to: "var(--color-yellow-600)", text: "text-caution" },
];

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("restaurant")) return "🍽️";
  if (lower.includes("transport") || lower.includes("travel")) return "🚗";
  if (lower.includes("shop") || lower.includes("retail")) return "🛍️";
  if (lower.includes("entertainment") || lower.includes("recreation")) return "🎬";
  if (lower.includes("groceries") || lower.includes("supermarket")) return "🛒";
  if (lower.includes("health") || lower.includes("medical")) return "🏥";
  if (lower.includes("utilities") || lower.includes("bills")) return "💡";
  if (lower.includes("home") || lower.includes("rent")) return "🏠";
  if (lower.includes("transfer")) return "💸";
  return "💰";
}

interface CategoryBarProps {
  category: Category & { color: typeof CATEGORY_COLORS[0] };
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

function CategoryBar({ category, index, isSelected, onClick }: CategoryBarProps) {
  return (
    <div
      key={category.category}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border border-subtle transition-all p-3 bg-surface hover:bg-surface-secondary/50",
        isSelected && "ring-1 ring-primary border-primary"
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
          style={{
            backgroundColor: category.color.from,
            color: "white"
          }}
        >
          {getCategoryIcon(category.category)}
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate text-default">
              {category.category}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-default block">
              {formatCurrency(Math.abs(category.amount))}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-surface-tertiary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${category.percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
            className="h-full"
            style={{
              backgroundColor: category.color.to
            }}
          />
        </div>
        <span className="text-xs text-secondary w-8 text-right tabular-nums">
          {Math.round(category.percentage)}%
        </span>
      </div>
    </div>
  );
}

interface DonutChartProps {
  categories: Array<Category & { color: typeof CATEGORY_COLORS[0] }>;
  totalSpending: number;
  selectedIndex: number | null;
  onSelectCategory: (index: number) => void;
}

function DonutChart({
  categories,
  totalSpending,
  selectedIndex,
  onSelectCategory,
}: DonutChartProps) {
  const size = 200;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-secondary)"
          strokeWidth={strokeWidth}
        />

        {/* Category segments */}
        {categories.map((category, index) => {
          const percentage = category.percentage;
          const offset =
            circumference - (accumulatedPercentage / 100) * circumference;
          const dashArray = `${(percentage / 100) * circumference} ${circumference}`;

          accumulatedPercentage += percentage;

          return (
            <motion.circle
              key={category.category}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={category.color.from}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={offset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
              className={cn(
                "cursor-pointer transition-all hover:opacity-80",
                selectedIndex !== null && selectedIndex !== index && "opacity-30"
              )}
              onClick={() => onSelectCategory(index)}
            />
          );
        })}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-xs font-medium text-secondary uppercase tracking-wide">
          Total Spent
        </div>
        <div className="text-2xl font-bold mt-1 text-default">
          {formatCurrency(totalSpending)}
        </div>
      </div>
    </div>
  );
}

export default function SpendingInsights() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as ToolMetadata | null;
  const [uiState, setUiState] = useWidgetState<SpendingUIState>({
    selectedIndex: null,
  });

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  // Check for auth requirements
  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  // Show loading state while waiting for tool output
  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

  if (!toolMetadata && !toolOutput.totalSpent) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No spending data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const rawCategories = toolMetadata?.allCategories || [];
  const totalSpending = toolOutput?.totalSpent ?? rawCategories.reduce(
    (sum, cat) => sum + Math.abs(cat.amount),
    0
  );

  if (rawCategories.length === 0) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No spending data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const categoriesWithMetadata = rawCategories.map((cat, index) => ({
    ...cat,
    percentage: cat.percentage ?? (totalSpending > 0 ? (Math.abs(cat.amount) / totalSpending) * 100 : 0),
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]!,
  }));

  // Sort by amount descending
  categoriesWithMetadata.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return (
    <div
      className={`antialiased w-full relative bg-transparent text-default ${!isFullscreen ? "overflow-hidden" : ""}`}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : undefined,
      }}
    >
      {/* Fullscreen expand button */}
      {!isFullscreen && (
        <Button
          onClick={() => {
            if (typeof window !== "undefined" && window.openai) {
              window.openai.requestDisplayMode({ mode: "fullscreen" });
            }
          }}
          variant="ghost"
          color="secondary"
          size="sm"
          className="absolute top-4 right-4 z-20"
          aria-label="Expand to fullscreen"
        >
          <Expand className="h-4 w-4" />
        </Button>
      )}

      {/* Content */}
      <div
        className={`w-full h-full overflow-y-auto ${isFullscreen ? "p-8" : "p-0"}`}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="heading-lg mb-2">
            Spending Insights
          </h1>
          <div className="flex items-center gap-3">
            <Trending className="w-5 h-5 text-danger" />
            <p className="text-sm text-secondary">
              Breakdown of your spending by category
            </p>
          </div>
        </div>

        {/* Layout: Chart + Categories */}
        <div className="flex flex-col gap-6">
          {/* Donut Chart - Always visible but optimized for sizes */}
          <div className="flex justify-center py-2">
            <DonutChart
              categories={categoriesWithMetadata}
              totalSpending={totalSpending}
              selectedIndex={uiState.selectedIndex}
              onSelectCategory={(index) =>
                setUiState(s => ({ ...s, selectedIndex: s.selectedIndex === index ? null : index }))
              }
            />
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            {categoriesWithMetadata.map((category, index) => (
              <CategoryBar
                key={category.category}
                category={category}
                index={index}
                onClick={() =>
                  setUiState(s => ({ ...s, selectedIndex: s.selectedIndex === index ? null : index }))
                }
                isSelected={uiState.selectedIndex === index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
