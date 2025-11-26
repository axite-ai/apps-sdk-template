"use client";

import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import type { BusinessCashFlowContent } from "@/lib/types/tool-responses";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import { useState } from "react";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { Expand } from "@openai/apps-sdk-ui/components/Icon";
import { cn } from "@/lib/utils/cn";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { formatCurrency } from "@/src/utils/format";

interface CashFlowProjection {
  month: number;
  monthLabel: string;
  projectedBalance: number;
  confidence: string;
  projectedNet: number;
  period: string;
}

interface ToolOutput extends Record<string, unknown> {
  structuredContent?: BusinessCashFlowContent;
}

export default function BusinessCashFlowWidget() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as any;

  const [showDetails, setShowDetails] = useState(false);

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  if (!toolOutput?.structuredContent) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No cash flow data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const { runway, currentPeriod, projections: contentProjections, healthStatus } = toolOutput.structuredContent;
  const projections = (toolMetadata?.projections ?? contentProjections ?? []) as CashFlowProjection[];

  const isHealthy = healthStatus === "positive";
  const runwayMonths = runway.months === Infinity ? "∞" : runway.months.toFixed(1);

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
          <h1 className="heading-lg mb-2">Business Cash Flow</h1>
          <div className={cn("text-lg font-semibold flex items-center gap-2", isHealthy ? "text-success" : "text-danger")}>
            {isHealthy ? (
              <Badge color="success" variant="soft" size="lg">Positive Cash Flow</Badge>
            ) : (
              <Badge color="danger" variant="soft" size="lg">Negative Cash Flow</Badge>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <AnimateLayout>
            <div key="revenue" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Revenue</div>
              <div className="text-2xl font-bold text-success">
                +{formatCurrency(currentPeriod.revenue)}
              </div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">Current period</div>
            </div>
          </AnimateLayout>

          <AnimateLayout>
            <div key="expenses" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Expenses</div>
              <div className="text-2xl font-bold text-danger">
                -{formatCurrency(currentPeriod.expenses)}
              </div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">Current period</div>
            </div>
          </AnimateLayout>

          <AnimateLayout>
            <div key="net-cash-flow" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Net Cash Flow</div>
              <div className={cn("text-2xl font-bold", currentPeriod.net >= 0 ? 'text-success' : 'text-danger')}>
                {currentPeriod.net >= 0 ? '+' : ''}{formatCurrency(currentPeriod.net)}
              </div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">Current period</div>
            </div>
          </AnimateLayout>

          <AnimateLayout>
            <div key="runway" className="bg-surface rounded-2xl border border-subtle p-4 shadow-hairline">
              <div className="text-sm text-secondary mb-1">Runway</div>
              <div className="text-2xl font-bold text-discovery">{runwayMonths}</div>
              <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">months remaining</div>
            </div>
          </AnimateLayout>
        </div>

        {/* Burn Rate */}
        <AnimateLayout>
          <div key="burn-rate" className="bg-surface rounded-2xl border border-subtle p-6 shadow-hairline mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-secondary mb-1">Burn Rate</div>
                <div className="text-3xl font-bold text-default">
                  {formatCurrency(currentPeriod.burnRate)}
                </div>
                <div className="text-xs text-tertiary mt-1 uppercase tracking-wide">Per month</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-secondary mb-1">Runway Status</div>
                <Badge
                  size="lg"
                  color={
                    runway.confidence === "high" ? "success" :
                    runway.confidence === "medium" ? "warning" : "danger"
                  }
                  variant="soft"
                >
                  {runway.confidence} Confidence
                </Badge>
              </div>
            </div>
            <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className={cn("h-full", isHealthy ? "bg-success" : "bg-danger")}
                style={{
                  width: `${Math.min(100, Math.abs((currentPeriod.net / (currentPeriod.revenue || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </AnimateLayout>

        {/* Projections */}
        {projections && projections.length > 0 && (
          <AnimateLayout>
            <div key="projections" className="bg-surface rounded-2xl border border-subtle p-6 shadow-hairline">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-default">Cash Flow Projections</h2>
                <span className="text-xs text-secondary uppercase tracking-wide">Based on current trends</span>
              </div>
              <div className="space-y-4">
                {projections.map((proj: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-secondary font-medium">{proj.period}</div>
                    <div className="flex-1 h-8 bg-surface-secondary rounded-lg overflow-hidden relative">
                      <div
                        className={cn("h-full transition-all duration-500 ease-out",
                          proj.projectedNet > 0
                            ? "bg-success"
                            : proj.projectedNet > -1000
                            ? "bg-warning"
                            : "bg-danger"
                        )}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.abs((proj.projectedNet / (currentPeriod.revenue || 1)) * 100)
                          )}%`,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-end pr-3 text-sm font-medium text-default mix-blend-exclusion">
                        {proj.projectedNet >= 0 ? '+' : ''}{formatCurrency(proj.projectedNet)}
                      </span>
                    </div>
                    <Badge
                      size="sm"
                      color={
                        proj.confidence === "high"
                          ? "success"
                          : proj.confidence === "medium"
                          ? "warning"
                          : "secondary"
                      }
                      variant="soft"
                      className="w-20 justify-center"
                    >
                      {proj.confidence}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </AnimateLayout>
        )}
      </div>
    </div>
  );
}
