"use client";

import React from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";
import PlaidRequired from "@/src/components/plaid-required";
import SubscriptionRequired from "@/src/components/subscription-required";

interface HealthAccount {
  account_id: string;
  name: string;
  warnings: string[];
}

interface ToolOutput {
  accounts?: HealthAccount[];
  featureName?: string;
  message?: string;
}

export default function AccountHealth() {
  const toolOutput = useWidgetProps();

  if (!toolOutput) {
    return <p>No health data available</p>;
  }

  // Check if bank connection is required
  if (toolOutput.message === 'Bank connection required') {
    return <PlaidRequired />;
  }

  if (toolOutput.error_message === 'Subscription required' || toolOutput.featureName) {
    return <SubscriptionRequired />;
  }

  if (!toolOutput.accounts) {
    return <p>No health data available</p>;
  }

  const statusClass = toolOutput.overallStatus === 'healthy' ? 'status-good' : 'status-warning';

  return (
    <div>
      <div className="health-summary">
        <div className={`status ${statusClass}`}>
          Overall Health: {(toolOutput.overallStatus || 'N/A').toString().toUpperCase()}
        </div>
      </div>
      {Array.isArray(toolOutput.accounts) && toolOutput.accounts.some((a: HealthAccount) => a.warnings.length > 0) ? (
        <div className="issues">
          {toolOutput.accounts.flatMap((a: HealthAccount) => a.warnings.map((w: string) => (
            <div key={`${a.account_id}-${w}`} className="issue">
              <div className="issue-title">{a.name}</div>
              <div>{w}</div>
            </div>
          )))}
        </div>
      ) : <p>No issues detected</p>}
    </div>
  );
}
