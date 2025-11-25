"use client";

import React from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";
import {
  Business,
  Check,
  ShieldCheck,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { cn } from "@/lib/utils/cn";

/**
 * PlaidConnectionPrompt - A reusable component for prompting bank connection
 * This is a simpler inline version that can be embedded in other widgets
 */
export default function PlaidConnectionPrompt() {
  const toolOutput = useWidgetProps();

  const handleConnect = () => {
    // Get the authenticated connect URL directly from the tool output
    // This URL already includes a one-time auth token
    const connectUrl: string = (toolOutput?.connectUrl as string | undefined) ||
                                (toolOutput?.baseUrl ? `${toolOutput.baseUrl}/connect-bank` : 'https://dev.askmymoney.ai/connect-bank');

    console.log('[Plaid Connect] Opening link:', connectUrl);

    // Open the authenticated link
    if (typeof window !== 'undefined' && window.openai) {
      window.openai.openExternal({ href: connectUrl });
    } else {
      window.location.href = connectUrl;
    }
  };

  return (
    <div className="p-4 rounded-lg border-none shadow-none bg-surface">
      <div className="flex items-start mb-3">
        <Business className="w-5 h-5 mr-2 flex-shrink-0 text-success" />
        <div className="flex-1">
          <h3 className="text-base font-bold mb-1 text-default">
            Connect Your Bank Account
          </h3>
          <p className="text-xs text-secondary">
            Link your financial accounts to access this feature
          </p>
        </div>
      </div>

      <div className="rounded-lg p-3 mb-3 bg-surface-secondary">
        <ul className="space-y-2">
          <li className="flex items-start text-xs text-secondary">
            <Check className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5 text-success" />
            <span>Real-time account balances</span>
          </li>
          <li className="flex items-start text-xs text-secondary">
            <Check className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5 text-success" />
            <span>Transaction history & insights</span>
          </li>
          <li className="flex items-start text-xs text-secondary">
            <Check className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5 text-success" />
            <span>AI-powered spending analysis</span>
          </li>
        </ul>
      </div>

      <div className="border rounded-lg p-2 mb-3 bg-info-soft border-info-surface">
        <div className="flex items-start">
          <ShieldCheck className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5 text-info" />
          <p className="text-xs text-info">
            Secured by Plaid. We never see your credentials.
          </p>
        </div>
      </div>

      <Button
        onClick={handleConnect}
        color="success"
        size="lg"
        block
      >
        Connect Bank Account
      </Button>

      <p className="text-xs text-center mt-2 text-tertiary">
        Powered by Plaid
      </p>
    </div>
  );
}

