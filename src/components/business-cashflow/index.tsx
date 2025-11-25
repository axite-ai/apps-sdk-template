"use client";

import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import type { BusinessCashFlowContent } from "@/lib/types/tool-responses";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import { useState } from "react";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { cn } from "@/lib/utils/cn";

interface CashFlowProjection {
  month: number;
  monthLabel: string;
  projectedBalance: number;
  confidence: string;
}

interface ToolOutput extends Record<string, unknown> {
  structuredContent?: BusinessCashFlowContent;
}

export default function BusinessCashFlowWidget() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as any;

  const [showDetails, setShowDetails] = useState(false);

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
    <div className="flex flex-col gap-4 p-0 bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="heading-lg text-default">Business Cash Flow</h1>
        <div className={cn("text-lg font-semibold", isHealthy ? "text-success" : "text-danger")}>
          {isHealthy ? "Positive" : "Negative"} Cash Flow
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg shadow-none border-none p-4">
          <div className="text-sm text-secondary">Revenue</div>
          <div className="text-2xl font-bold text-success">
            +${currentPeriod.revenue.toFixed(2)}
          </div>
          <div className="text-xs text-tertiary mt-1">Current period</div>
        </div>

        <div className="bg-surface rounded-lg shadow-none border-none p-4">
          <div className="text-sm text-secondary">Expenses</div>
          <div className="text-2xl font-bold text-danger">
            -${currentPeriod.expenses.toFixed(2)}
          </div>
          <div className="text-xs text-tertiary mt-1">Current period</div>
        </div>

        <div className="bg-surface rounded-lg shadow-none border-none p-4">
          <div className="text-sm text-secondary">Net Cash Flow</div>
          <div className={cn("text-2xl font-bold", currentPeriod.net >= 0 ? 'text-success' : 'text-danger')}>
            {currentPeriod.net >= 0 ? '+' : ''}${currentPeriod.net.toFixed(2)}
          </div>
          <div className="text-xs text-tertiary mt-1">Current period</div>
        </div>

        <div className="bg-surface rounded-lg shadow-none border-none p-4">
          <div className="text-sm text-secondary">Runway</div>
          <div className="text-2xl font-bold text-discovery">{runwayMonths}</div>
          <div className="text-xs text-tertiary mt-1">months remaining</div>
        </div>
      </div>

      {/* Burn Rate */}
      <div className="bg-surface rounded-lg shadow-none border-none p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-secondary">Burn Rate</div>
            <div className="text-3xl font-bold text-default">
              ${currentPeriod.burnRate.toFixed(2)}
            </div>
            <div className="text-xs text-tertiary mt-1">Per month</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-secondary">Runway Status</div>
            <div className={cn("text-xl font-semibold",
              runway.confidence === "high" ? "text-success" :
              runway.confidence === "medium" ? "text-warning" : "text-danger"
            )}>
              {runway.confidence}
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className={cn("h-full", isHealthy ? "bg-success" : "bg-danger")}
            style={{
              width: `${Math.min(100, Math.abs((currentPeriod.net / currentPeriod.revenue) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* Projections */}
      {projections && projections.length > 0 && (
        <div className="bg-surface rounded-lg shadow-none border-none p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-default">Cash Flow Projections</h2>
            <span className="text-xs text-secondary">Based on current trends</span>
          </div>
          <div className="space-y-2">
            {projections.map((proj: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-24 text-sm text-secondary">{proj.period}</div>
                <div className="flex-1 h-8 bg-surface-secondary rounded-lg overflow-hidden relative">
                  <div
                    className={cn("h-full",
                      proj.projectedNet > 0
                        ? "bg-success"
                        : proj.projectedNet > -1000
                        ? "bg-warning"
                        : "bg-danger"
                    )}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.abs((proj.projectedNet / currentPeriod.revenue) * 100)
                      )}%`,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 text-sm font-medium text-default">
                    {proj.projectedNet >= 0 ? '+' : ''}${proj.projectedNet.toFixed(0)}
                  </span>
                </div>
                <span
                  className={cn("text-xs px-2 py-1 rounded",
                    proj.confidence === "high"
                      ? "bg-success-soft text-success"
                      : proj.confidence === "medium"
                      ? "bg-warning-soft text-warning"
                      : "bg-surface-tertiary text-secondary"
                  )}
                >
                  {proj.confidence}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
