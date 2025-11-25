"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Expand, ArrowDown, Trending } from "@openai/apps-sdk-ui/components/Icon";
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
import WidgetLoadingSkeleton from "@/src/components/shared/widget-loading-skeleton";

interface Category {
  name: string;
  amount: number;
  percentage: number;
}

interface ToolOutput extends Record<string, unknown> {
  totalSpending?: number;
  categoryCount?: number;
  dateRange?: { start: string; end: string };
  message?: string;
  error_message?: string;
  featureName?: string;
}

interface ToolMetadata {
  categories: Category[];
}

interface SpendingUIState extends Record<string, unknown> {
  selectedIndex: number | null;
}

// SDK Color Tokens mapping
const CATEGORY_COLORS = [
  { from: "var(--color-blue-500)", to: "var(--color-blue-600)", text: "text-info" },
  { from: "var(--color-purple-500)", to: "var(--color-purple-600)", text: "text-discovery" },
  { from: "var(--color-pink-500)", to: "var(--color-pink-600)", text: "text-discovery" }, // Approximate
  { from: "var(--color-red-500)", to: "var(--color-red-600)", text: "text-danger" },
  { from: "var(--color-orange-500)", to: "var(--color-orange-600)", text: "text-warning" },
  { from: "var(--color-yellow-500)", to: "var(--color-yellow-600)", text: "text-caution" },
  { from: "var(--color-green-500)", to: "var(--color-green-600)", text: "text-success" },
  { from: "var(--color-teal-500)", to: "var(--color-teal-600)", text: "text-success" }, // Approximate
];

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
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
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        bounce: 0.2,
        duration: 0.6,
        delay: index * 0.05,
      }}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-xl border-none transition-all p-4 bg-surface shadow-none hover:bg-surface-secondary",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{
            background: `linear-gradient(135deg, ${category.color.from}, ${category.color.to})`,
            color: "white"
          }}
        >
          {getCategoryIcon(category.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate text-default">
            {category.name}
          </h3>
          <p className="text-xs text-secondary">
            {formatPercent(category.percentage / 100)}
          </p>
        </div>
        <div className="text-base font-semibold text-default">
          {formatCurrency(Math.abs(category.amount))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden bg-surface-tertiary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${category.percentage}%` }}
          transition={{
            type: "spring",
            bounce: 0.3,
            duration: 1,
            delay: index * 0.05 + 0.3,
          }}
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${category.color.from}, ${category.color.to})`
          }}
        />
      </div>
    </motion.div>
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
          stroke="var(--color-surface-tertiary)"
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
              key={category.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#gradient-${index})`}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={offset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{
                type: "spring",
                bounce: 0.2,
                duration: 1,
                delay: index * 0.1,
              }}
              className={cn(
                "cursor-pointer transition-all",
                selectedIndex === index
                  ? "opacity-100"
                  : selectedIndex !== null
                  ? "opacity-30"
                  : "opacity-100 hover:opacity-80"
              )}
              onClick={() => onSelectCategory(index)}
              style={{
                strokeLinecap: "round",
              }}
            />
          );
        })}

        {/* Gradients */}
        <defs>
          {categories.map((category, index) => (
            <linearGradient
              key={`gradient-${index}`}
              id={`gradient-${index}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={category.color.from} />
              <stop offset="100%" stopColor={category.color.to} />
            </linearGradient>
          ))}
        </defs>
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-xs font-medium text-secondary">
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

  if (!toolMetadata && !toolOutput.totalSpending) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No spending data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const rawCategories = toolMetadata?.categories || [];
  const totalSpending = toolOutput?.totalSpending ?? rawCategories.reduce(
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
        <div
          className={cn(
            "grid gap-6",
            isFullscreen ? "grid-cols-1 lg:grid-cols-[300px,1fr]" : "grid-cols-1"
          )}
        >
          {/* Donut Chart (fullscreen only) */}
          {isFullscreen && (
            <div className="flex items-start justify-center lg:sticky lg:top-0">
              <DonutChart
                categories={categoriesWithMetadata}
                totalSpending={totalSpending}
                selectedIndex={uiState.selectedIndex}
                onSelectCategory={(index) =>
                  setUiState(s => ({ ...s, selectedIndex: s.selectedIndex === index ? null : index }))
                }
              />
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {categoriesWithMetadata.map((category, index) => (
                <CategoryBar
                  key={category.name}
                  category={category}
                  index={index}
                  onClick={() =>
                    setUiState(s => ({ ...s, selectedIndex: s.selectedIndex === index ? null : index }))
                  }
                  isSelected={uiState.selectedIndex === index}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
