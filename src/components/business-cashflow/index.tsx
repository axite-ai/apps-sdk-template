"use client";

import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import type { BusinessCashFlowContent } from "@/lib/types/tool-responses";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import { WidgetLoadingSkeleton } from "@/src/components/shared/widget-loading-skeleton";
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

interface ToolOutput extends BusinessCashFlowContent, Record<string, unknown> {}

export default function BusinessCashFlowWidget() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as any;

  const [showDetails, setShowDetails] = useState(false);

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  // Show loading skeleton during initial load
  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  // Show empty state only if there's truly no data
  if (!toolOutput.runway) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No cash flow data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const { runway, currentPeriod, projections: contentProjections, healthStatus } = toolOutput;
  const projections = (toolMetadata?.projections ?? contentProjections ?? []) as CashFlowProjection[];

  const isHealthy = healthStatus === "positive";
  const runwayMonths = runway.months === Infinity ? "∞" : runway.months.toFixed(1);

  return (
    <div
      className={cn(
        "antialiased w-full relative bg-transparent text-default flex flex-col",
        !isFullscreen && "overflow-hidden min-h-[400px]"
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
      <div className={cn("w-full h-full overflow-y-auto flex flex-col", isFullscreen ? "p-8 justify-start" : "p-6 justify-center")}>
        {/* Header */}
        <div className={cn("mb-6", !isFullscreen && "text-center")}>
          <h1 className="heading-lg mb-2">Business Cash Flow</h1>
          <div className={cn("text-lg font-semibold flex items-center gap-2", isHealthy ? "text-success" : "text-danger", !isFullscreen && "justify-center")}>
            {isHealthy ? (
              <Badge color="success" variant="soft" size="lg">Positive Cash Flow</Badge>
            ) : (
              <Badge color="danger" variant="soft" size="lg">Negative Cash Flow</Badge>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <AnimateLayout>
          <div key="metrics" className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface rounded-xl border border-subtle p-4 shadow-sm">
              <div className="text-xs font-medium text-secondary uppercase tracking-wide mb-1">Net Flow</div>
              <div className={cn("text-2xl font-bold", currentPeriod.net >= 0 ? 'text-success' : 'text-danger')}>
                {currentPeriod.net >= 0 ? '+' : ''}{formatCurrency(currentPeriod.net)}
              </div>
              <div className="mt-2 text-xs text-tertiary flex justify-between">
                <span>In: <span className="text-success">+{formatCurrency(currentPeriod.revenue)}</span></span>
                <span>Out: <span className="text-danger">-{formatCurrency(currentPeriod.expenses)}</span></span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-subtle p-4 shadow-sm">
              <div className="text-xs font-medium text-secondary uppercase tracking-wide mb-1">Runway</div>
              <div className="text-2xl font-bold text-discovery">{runwayMonths} <span className="text-sm font-normal text-secondary">months</span></div>
              <div className="mt-2 text-xs text-tertiary">
                Based on avg burn rate of {formatCurrency(currentPeriod.burnRate)}/mo
              </div>
            </div>
          </div>
        </AnimateLayout>

        {/* Projections Chart - Only shown in fullscreen */}
        {isFullscreen && projections && projections.length > 0 && (
          <AnimateLayout>
            <div key="projections" className="bg-surface rounded-xl border border-subtle p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-default">6-Month Projection</h2>
                <Badge size="sm" variant="soft" color="secondary">Forecast</Badge>
              </div>

              <div className="space-y-3">
                {projections.map((proj: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <div className="w-12 text-secondary font-medium">{proj.period.split(' ')[0]}</div>
                    <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full",
                          proj.projectedNet > 0 ? "bg-success" : "bg-danger"
                        )}
                        style={{
                          width: `${Math.min(100, Math.abs((proj.projectedNet / Math.max(currentPeriod.revenue, 1)) * 100))}%`,
                          opacity: 0.5 + (idx * 0.1) // Subtle gradient effect for future months
                        }}
                      />
                    </div>
                    <div className={cn("w-20 text-right font-medium",
                      proj.projectedNet >= 0 ? "text-success" : "text-danger"
                    )}>
                      {proj.projectedNet >= 0 ? '+' : ''}{formatCurrency(proj.projectedNet)}
                    </div>
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
