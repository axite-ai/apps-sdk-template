"use client";

import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import type { ExpenseCategorizationContent } from "@/lib/types/tool-responses";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import { useState } from "react";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Select } from "@openai/apps-sdk-ui/components/Select";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { Expand } from "@openai/apps-sdk-ui/components/Icon";
import { cn } from "@/lib/utils/cn";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { formatCurrency } from "@/src/utils/format";
import { WidgetLoadingSkeleton } from "@/src/components/shared/widget-loading-skeleton";

interface ExpenseSuggestion {
  transaction_id: string;
  merchant: string;
  amount: number;
  date: string;
  plaidCategory?: string;
  plaidDetailed?: string;
  suggestedTaxCategory: string;
  confidence: number;
  needsReview: boolean;
}

interface ToolOutput extends ExpenseCategorizationContent, Record<string, unknown> {}

export default function ExpenseCategorizerWidget() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as any;

  const [filterReview, setFilterReview] = useState<"all" | "needs_review" | "high_confidence">(
    "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";


  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  if (typeof toolOutput.totalAmount !== 'number') {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No expense data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const { categorized, needsReview, taxCategories, totalAmount } = toolOutput;
  const allSuggestions = (toolMetadata?.allSuggestions ?? []) as ExpenseSuggestion[];
  const confidenceDistribution = toolMetadata?.confidenceDistribution as {
    high: number;
    medium: number;
    low: number;
  };

  // Filter suggestions
  const filteredSuggestions = allSuggestions.filter((s) => {
    if (filterReview === "needs_review" && !s.needsReview) return false;
    if (filterReview === "high_confidence" && s.confidence < 0.8) return false;
    if (selectedCategory !== "all" && s.suggestedTaxCategory !== selectedCategory) return false;
    return true;
  });

  const taxCategoryList = Object.keys(taxCategories);

  return (
    <div
      className={cn(
        "antialiased w-full relative bg-transparent text-default",
        !isFullscreen && "overflow-hidden"
      )}
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
      <div className={cn("w-full h-full overflow-y-auto", isFullscreen ? "p-8" : "p-0")}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="heading-lg mb-2">Expense Categorizer</h1>
          <div className="text-sm text-secondary">{formatCurrency(totalAmount)} total expenses</div>
        </div>

        {/* Summary Cards */}
        <div className={cn(
          "grid gap-4 mb-6",
          isFullscreen ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
        )}>
          <AnimateLayout>
            <div key="auto-categorized" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Auto-Categorized</div>
              <div className="text-2xl font-bold text-success">{categorized}</div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">High confidence</div>
            </div>
          </AnimateLayout>

          <AnimateLayout>
            <div key="needs-review" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Needs Review</div>
              <div className="text-2xl font-bold text-warning">{needsReview}</div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">Manual check required</div>
            </div>
          </AnimateLayout>

          <AnimateLayout>
            <div key="tax-categories" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Tax Categories</div>
              <div className="text-2xl font-bold text-info">{taxCategoryList.length}</div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">Distinct categories</div>
            </div>
          </AnimateLayout>

          <AnimateLayout>
            <div key="total-expenses" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Total Expenses</div>
              <div className="text-2xl font-bold text-default">{allSuggestions.length}</div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">Transactions reviewed</div>
            </div>
          </AnimateLayout>
        </div>

        {/* Content only visible in fullscreen */}
        {isFullscreen ? (
          <>
            {/* Confidence Distribution */}
            {confidenceDistribution && (
              <AnimateLayout>
                <div key="confidence-distribution" className="bg-surface rounded-2xl border border-subtle p-6 shadow-hairline mb-6">
                  <h2 className="text-lg font-semibold text-default mb-4">Confidence Distribution</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm text-secondary">High (≥80%)</div>
                      <div className="flex-1 h-6 bg-surface-secondary rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-success"
                          style={{
                            width: `${(confidenceDistribution.high / allSuggestions.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-default w-8 text-right">
                        {confidenceDistribution.high}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm text-secondary">Medium (60-80%)</div>
                      <div className="flex-1 h-6 bg-surface-secondary rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-warning"
                          style={{
                            width: `${(confidenceDistribution.medium / allSuggestions.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-default w-8 text-right">
                        {confidenceDistribution.medium}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm text-secondary">Low ({'<'}60%)</div>
                      <div className="flex-1 h-6 bg-surface-secondary rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-danger"
                          style={{
                            width: `${(confidenceDistribution.low / allSuggestions.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-default w-8 text-right">
                        {confidenceDistribution.low}
                      </span>
                    </div>
                  </div>
                </div>
              </AnimateLayout>
            )}

            {/* Tax Category Breakdown */}
            <AnimateLayout>
              <div key="tax-breakdown" className="bg-surface rounded-2xl border border-subtle p-6 shadow-hairline mb-6">
                <h2 className="text-lg font-semibold text-default mb-4">Tax Category Breakdown</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {taxCategoryList.map((category) => (
                    <div
                      key={category}
                      className="border border-subtle bg-surface-secondary rounded-xl p-3 hover:bg-surface-tertiary transition-colors cursor-pointer"
                      onClick={() =>
                        setSelectedCategory(selectedCategory === category ? "all" : category)
                      }
                    >
                      <div className="text-sm font-medium text-default truncate">{category}</div>
                      <div className="text-xl font-bold text-info mt-1">
                        {formatCurrency(taxCategories[category])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateLayout>

            {/* Filters */}
            <div className="flex gap-4 items-center mb-4">
              <div className="w-48">
                <Select
                  value={filterReview}
                  onChange={(val: any) => setFilterReview(val.value)}
                  options={[
                    { value: "all", label: "All Suggestions" },
                    { value: "needs_review", label: "Needs Review" },
                    { value: "high_confidence", label: "High Confidence" }
                  ]}
                  size="sm"
                />
              </div>

              <div className="w-48">
                <Select
                  value={selectedCategory}
                  onChange={(val: any) => setSelectedCategory(val.value)}
                  options={[
                    { value: "all", label: "All Categories" },
                    ...taxCategoryList.map(cat => ({ value: cat, label: cat }))
                  ]}
                  size="sm"
                />
              </div>

              <div className="text-sm text-secondary ml-auto">
                Showing {filteredSuggestions.length} of {allSuggestions.length} expenses
              </div>
            </div>

            {/* Suggestions List */}
            <div className="space-y-3">
              {filteredSuggestions.map((suggestion) => (
                <AnimateLayout>
                  <div
                    key={suggestion.transaction_id}
                    className={cn(
                      "bg-surface rounded-xl border border-subtle p-4 shadow-hairline hover:bg-surface-secondary transition-colors",
                      suggestion.needsReview && "border-l-4 border-l-warning border-y-subtle border-r-subtle"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-default">{suggestion.merchant}</h3>
                          {suggestion.needsReview && (
                            <Badge color="warning" size="sm" pill>Review</Badge>
                          )}
                        </div>
                        <div className="text-sm text-secondary">
                          {new Date(suggestion.date).toLocaleDateString()}
                        </div>
                        {suggestion.plaidCategory && (
                          <div className="text-xs text-tertiary mt-1">
                            Plaid: {suggestion.plaidCategory}
                            {suggestion.plaidDetailed && ` → ${suggestion.plaidDetailed}`}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-default">
                          {formatCurrency(suggestion.amount)}
                        </div>
                        <div className="text-xs font-medium text-info mt-1">
                          {suggestion.suggestedTaxCategory}
                        </div>
                        <div className="text-xs text-tertiary mt-1">
                          {(suggestion.confidence * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimateLayout>
              ))}
            </div>

            {filteredSuggestions.length === 0 && (
              <EmptyMessage>
                <EmptyMessage.Title>No expenses found</EmptyMessage.Title>
                <EmptyMessage.Description>Try adjusting your filters</EmptyMessage.Description>
              </EmptyMessage>
            )}
          </>
        ) : (
          <div className="mt-8 text-center">
            <EmptyMessage>
              <EmptyMessage.Title>View full details</EmptyMessage.Title>
              <EmptyMessage.Description>
                Expand to see detailed breakdown, confidence scores, and review individual transactions.
              </EmptyMessage.Description>
              <EmptyMessage.ActionRow>
                <Button
                  color="primary"
                  onClick={() => {
                    if (typeof window !== "undefined" && window.openai) {
                      window.openai.requestDisplayMode({ mode: "fullscreen" });
                    }
                  }}
                >
                  Expand View
                </Button>
              </EmptyMessage.ActionRow>
            </EmptyMessage>
          </div>
        )}
      </div>
    </div>
  );
}
