"use client";

import React from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";

interface ManageSubscriptionProps extends Record<string, unknown> {
  billingPortalUrl?: string;
  currentPlan?: string;
  message?: string;
}

export default function ManageSubscription() {
  const toolOutput = useWidgetProps<ManageSubscriptionProps>();

  const billingPortalUrl = toolOutput?.billingPortalUrl;
  const currentPlan = toolOutput?.currentPlan;

  const handleManageSubscription = () => {
    if (!billingPortalUrl) {
      return;
    }

    // Check if we're in ChatGPT MCP context
    if (typeof window !== 'undefined' && window.openai?.openExternal) {
      // In ChatGPT iframe - use openExternal
      window.openai.openExternal({ href: billingPortalUrl });
    } else {
      // Regular browser - use window.open
      window.open(billingPortalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!billingPortalUrl) {
    return (
      <div className="p-4 rounded-lg bg-linear-to-br from-gray-800 to-gray-900 border border-red-500/30 text-white shadow-xl">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">Configuration Error</h2>
            <p className="text-sm text-gray-300">Billing portal is not configured. Please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-linear-to-br from-gray-800 to-gray-900 border border-blue-500/30 text-white shadow-xl">
      <div>
        <div className="flex items-start mb-4">
          <svg className="w-6 h-6 text-blue-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">Manage Your Subscription</h2>
            <p className="text-sm text-gray-300">Update your plan, payment methods, or billing information</p>
          </div>
        </div>

        {currentPlan && (
          <div className="mb-4 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Current Plan</div>
              <div className="text-base font-bold text-blue-400 capitalize">{currentPlan}</div>
            </div>
          </div>
        )}

        <div className="mb-4 space-y-2">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-400 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-gray-300">View and update your payment methods</p>
          </div>
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-400 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-gray-300">Change or cancel your subscription</p>
          </div>
          <div className="flex items-start">
            <svg className="w-4 h-4 text-green-400 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-gray-300">View billing history and invoices</p>
          </div>
        </div>

        <button
          onClick={handleManageSubscription}
          className="w-full bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg"
        >
          Open Billing Portal
        </button>

        <p className="text-xs text-gray-500 text-center mt-2">
          Secure billing portal powered by Stripe
        </p>
      </div>
    </div>
  );
}
