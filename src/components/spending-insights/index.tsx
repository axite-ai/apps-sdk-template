"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, TrendingDown, TrendingUp } from "lucide-react";
import { useWidgetProps } from "@/src/use-widget-props";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { useTheme } from "@/src/use-theme";
import { formatCurrency, formatPercent } from "@/src/utils/format";
import PlaidRequired from "@/src/components/plaid-required";
import SubscriptionRequired from "@/src/components/subscription-required";
import { cn } from "@/lib/utils/cn";

interface Category {
  name: string;
  amount: number;
}

interface ToolOutput {
  categories?: Category[];
  message?: string;
  error_message?: string;
  featureName?: string;
}

const CATEGORY_COLORS = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-rose-500 to-rose-600",
  "from-orange-500 to-orange-600",
  "from-amber-500 to-amber-600",
  "from-lime-500 to-lime-600",
  "from-emerald-500 to-emerald-600",
  "from-teal-500 to-teal-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
];

const CATEGORY_SOLID_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-violet-500",
];

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("food") || lower.includes("restaurant"))
    return "🍽️";
  if (lower.includes("transport") || lower.includes("travel")) return "🚗";
  if (lower.includes("shop") || lower.includes("retail")) return "🛍️";
  if (lower.includes("entertainment") || lower.includes("recreation"))
    return "🎬";
  if (lower.includes("groceries") || lower.includes("supermarket")) return "🛒";
  if (lower.includes("health") || lower.includes("medical")) return "🏥";
  if (lower.includes("utilities") || lower.includes("bills")) return "💡";
  if (lower.includes("home") || lower.includes("rent")) return "🏠";
  if (lower.includes("transfer")) return "💸";
  return "💰";
}

interface CategoryBarProps {
  category: Category & { percentage: number; color: string; solidColor: string };
  index: number;
  isFullscreen: boolean;
  isDark: boolean;
  onClick: () => void;
  isSelected: boolean;
}

function CategoryBar({
  category,
  index,
  isFullscreen,
  isDark,
  onClick,
  isSelected,
}: CategoryBarProps) {
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
        "group cursor-pointer rounded-xl border transition-all p-4",
        isSelected
          ? isDark
            ? "bg-white/10 border-white/30"
            : "bg-black/5 border-black/30"
          : isDark
          ? "bg-gray-800 border-white/10 hover:border-white/20"
          : "bg-white border-black/10 hover:border-black/20",
        "shadow-[0px_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0px_6px_14px_rgba(0,0,0,0.1)]"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-lg bg-gradient-to-br",
            category.color
          )}
        >
          {getCategoryIcon(category.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "font-medium text-sm truncate",
              isDark ? "text-white" : "text-black"
            )}
          >
            {category.name}
          </h3>
          <p
            className={cn(
              "text-xs",
              isDark ? "text-white/50" : "text-black/50"
            )}
          >
            {formatPercent(category.percentage)}
          </p>
        </div>
        <div
          className={cn(
            "text-base font-semibold",
            isDark ? "text-white" : "text-black"
          )}
        >
          {formatCurrency(Math.abs(category.amount))}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className={cn(
          "h-2 rounded-full overflow-hidden",
          isDark ? "bg-white/10" : "bg-black/5"
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${category.percentage}%` }}
          transition={{
            type: "spring",
            bounce: 0.3,
            duration: 1,
            delay: index * 0.05 + 0.3,
          }}
          className={cn("h-full bg-gradient-to-r", category.color)}
        />
      </div>
    </motion.div>
  );
}

interface DonutChartProps {
  categories: Array<Category & { percentage: number; color: string; solidColor: string }>;
  totalSpending: number;
  isDark: boolean;
  selectedIndex: number | null;
  onSelectCategory: (index: number) => void;
}

function DonutChart({
  categories,
  totalSpending,
  isDark,
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
          stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
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
              <stop
                offset="0%"
                stopColor={
                  category.color.includes("blue")
                    ? "#3b82f6"
                    : category.color.includes("purple")
                    ? "#a855f7"
                    : category.color.includes("pink")
                    ? "#ec4899"
                    : category.color.includes("rose")
                    ? "#f43f5e"
                    : category.color.includes("orange")
                    ? "#f97316"
                    : category.color.includes("amber")
                    ? "#f59e0b"
                    : category.color.includes("lime")
                    ? "#84cc16"
                    : category.color.includes("emerald")
                    ? "#10b981"
                    : category.color.includes("teal")
                    ? "#14b8a6"
                    : category.color.includes("cyan")
                    ? "#06b6d4"
                    : category.color.includes("indigo")
                    ? "#6366f1"
                    : "#8b5cf6"
                }
              />
              <stop
                offset="100%"
                stopColor={
                  category.color.includes("blue")
                    ? "#2563eb"
                    : category.color.includes("purple")
                    ? "#9333ea"
                    : category.color.includes("pink")
                    ? "#db2777"
                    : category.color.includes("rose")
                    ? "#e11d48"
                    : category.color.includes("orange")
                    ? "#ea580c"
                    : category.color.includes("amber")
                    ? "#d97706"
                    : category.color.includes("lime")
                    ? "#65a30d"
                    : category.color.includes("emerald")
                    ? "#059669"
                    : category.color.includes("teal")
                    ? "#0d9488"
                    : category.color.includes("cyan")
                    ? "#0891b2"
                    : category.color.includes("indigo")
                    ? "#4f46e5"
                    : "#7c3aed"
                }
              />
            </linearGradient>
          ))}
        </defs>
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div
          className={cn(
            "text-xs font-medium",
            isDark ? "text-white/50" : "text-black/50"
          )}
        >
          Total Spent
        </div>
        <div
          className={cn(
            "text-2xl font-bold mt-1",
            isDark ? "text-white" : "text-black"
          )}
        >
          {formatCurrency(totalSpending)}
        </div>
      </div>
    </div>
  );
}

export default function SpendingInsights() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const isFullscreen = displayMode === "fullscreen";
  const isDark = theme === "dark";
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Auth checks
  if (!toolOutput) {
    return (
      <div className="p-8 text-center text-black/60 dark:text-white/60">
        <p>No spending data available</p>
      </div>
    );
  }

  if (toolOutput.message === "Bank connection required") {
    return <PlaidRequired />;
  }

  if (
    toolOutput.error_message === "Subscription required" ||
    toolOutput.featureName
  ) {
    return <SubscriptionRequired />;
  }

  if (!toolOutput.categories || toolOutput.categories.length === 0) {
    return (
      <div className="p-8 text-center text-black/60 dark:text-white/60">
        <p>No spending data available</p>
      </div>
    );
  }

  const rawCategories = toolOutput.categories;
  const totalSpending = rawCategories.reduce(
    (sum, cat) => sum + Math.abs(cat.amount),
    0
  );

  const categoriesWithMetadata = rawCategories.map((cat, index) => ({
    ...cat,
    percentage: (Math.abs(cat.amount) / totalSpending) * 100,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]!,
    solidColor: CATEGORY_SOLID_COLORS[index % CATEGORY_SOLID_COLORS.length]!,
  }));

  // Sort by amount descending
  categoriesWithMetadata.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return (
    <div
      className={cn(
        "antialiased w-full relative",
        isDark ? "bg-gray-900" : "bg-gray-50",
        !isFullscreen && "overflow-hidden"
      )}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : undefined,
      }}
    >
      {/* Fullscreen expand button */}
      {!isFullscreen && (
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.openai) {
              window.openai.requestDisplayMode({ mode: "fullscreen" });
            }
          }}
          className={cn(
            "absolute top-4 right-4 z-20 p-2 rounded-full shadow-lg transition-all",
            isDark
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-white text-black hover:bg-gray-100",
            "ring-1",
            isDark ? "ring-white/10" : "ring-black/5"
          )}
          aria-label="Expand to fullscreen"
        >
          <Maximize2 strokeWidth={1.5} className="h-4 w-4" />
        </button>
      )}

      {/* Content */}
      <div
        className={cn(
          "w-full h-full overflow-y-auto",
          isFullscreen ? "p-8" : "p-5"
        )}
      >
        {/* Header */}
        <div className="mb-6">
          <h1
            className={cn(
              "text-2xl font-semibold mb-2",
              isDark ? "text-white" : "text-black"
            )}
          >
            Spending Insights
          </h1>
          <div className="flex items-center gap-3">
            <TrendingDown
              className={cn(
                "w-5 h-5",
                isDark ? "text-rose-400" : "text-rose-600"
              )}
            />
            <p
              className={cn(
                "text-sm",
                isDark ? "text-white/60" : "text-black/60"
              )}
            >
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
                isDark={isDark}
                selectedIndex={selectedIndex}
                onSelectCategory={(index) =>
                  setSelectedIndex(selectedIndex === index ? null : index)
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
                  isFullscreen={isFullscreen}
                  isDark={isDark}
                  onClick={() =>
                    setSelectedIndex(selectedIndex === index ? null : index)
                  }
                  isSelected={selectedIndex === index}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
