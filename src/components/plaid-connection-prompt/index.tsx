"use client";

import React from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";
import { useTheme } from "@/src/use-theme";
import { cn } from "@/lib/utils/cn";

/**
 * PlaidConnectionPrompt - A reusable component for prompting bank connection
 * This is a simpler inline version that can be embedded in other widgets
 */
export default function PlaidConnectionPrompt() {
  const toolOutput = useWidgetProps();
  const theme = useTheme();
  const isDark = theme === "dark";

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
    <div className={cn(
      "p-4 rounded-lg border shadow-xl",
      isDark
        ? "bg-gradient-to-br from-gray-800 to-gray-900 border-green-500/30 text-white"
        : "bg-gradient-to-br from-gray-50 to-gray-100 border-green-300 text-black"
    )}>
      <div className="flex items-start mb-3">
        <svg className={cn("w-5 h-5 mr-2 flex-shrink-0", isDark ? "text-green-400" : "text-green-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <div className="flex-1">
          <h3 className={cn("text-base font-bold mb-1", isDark ? "text-white" : "text-black")}>
            Connect Your Bank Account
          </h3>
          <p className={cn("text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            Link your financial accounts to access this feature
          </p>
        </div>
      </div>

      <div className={cn(
        "rounded-lg p-3 mb-3",
        isDark ? "bg-gray-800/50" : "bg-gray-100"
      )}>
        <ul className="space-y-2">
          <li className={cn("flex items-start text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            <svg className={cn("w-3 h-3 mr-2 flex-shrink-0 mt-0.5", isDark ? "text-green-400" : "text-green-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Real-time account balances</span>
          </li>
          <li className={cn("flex items-start text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            <svg className={cn("w-3 h-3 mr-2 flex-shrink-0 mt-0.5", isDark ? "text-green-400" : "text-green-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Transaction history & insights</span>
          </li>
          <li className={cn("flex items-start text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            <svg className={cn("w-3 h-3 mr-2 flex-shrink-0 mt-0.5", isDark ? "text-green-400" : "text-green-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>AI-powered spending analysis</span>
          </li>
        </ul>
      </div>

      <div className={cn(
        "border rounded-lg p-2 mb-3",
        isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"
      )}>
        <div className="flex items-start">
          <svg className={cn("w-3 h-3 mr-2 flex-shrink-0 mt-0.5", isDark ? "text-blue-400" : "text-blue-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className={cn("text-xs", isDark ? "text-blue-200" : "text-blue-700")}>
            Secured by Plaid. We never see your credentials.
          </p>
        </div>
      </div>

      <button
        onClick={handleConnect}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-lg text-sm"
      >
        Connect Bank Account
      </button>

      <p className={cn("text-xs text-center mt-2", isDark ? "text-gray-500" : "text-gray-500")}>
        Powered by Plaid
      </p>
    </div>
  );
}

