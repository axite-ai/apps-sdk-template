"use client";

import { useState } from "react";
import { PreviewWrapper } from "@/src/components/preview-wrapper";
import { MOCK_DATA } from "./mock-data";

// Dynamically import widgets to mimic separate page loads
import AccountBalances from "@/src/components/account-balances";
import AccountHealth from "@/src/components/account-health";
import BusinessCashflow from "@/src/components/business-cashflow";
import ConnectItem from "@/src/components/connect-item";
import ExpenseCategorizer from "@/src/components/expense-categorizer";
import Investments from "@/src/components/investments";
import Liabilities from "@/src/components/liabilities";
import ManageSubscription from "@/src/components/manage-subscription";
import PlaidRequired from "@/src/components/plaid-required";
import RecurringPayments from "@/src/components/recurring-payments";
import SpendingInsights from "@/src/components/spending-insights";
import SubscriptionRequired from "@/src/components/subscription-required";
import TestWidget from "@/src/components/test-widget";
import Transactions from "@/src/components/transactions";

const WIDGETS = {
  "account-balances": AccountBalances,
  "account-health": AccountHealth,
  "business-cashflow": BusinessCashflow,
  "connect-item": ConnectItem,
  "expense-categorizer": ExpenseCategorizer,
  "investments": Investments,
  "liabilities": Liabilities,
  "manage-subscription": ManageSubscription,
  "plaid-required": PlaidRequired,
  "recurring-payments": RecurringPayments,
  "spending-insights": SpendingInsights,
  "subscription-required": SubscriptionRequired,
  "test-widget": TestWidget,
  "transactions": Transactions,
};

export default function PreviewPage() {
  const [selectedWidget, setSelectedWidget] = useState<keyof typeof WIDGETS>("account-balances");

  const WidgetComponent = WIDGETS[selectedWidget];
  const mockData = MOCK_DATA[selectedWidget as keyof typeof MOCK_DATA];

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4">
          <h1 className="heading-xl text-default">Widget Preview Gallery</h1>
          <p className="body-base text-secondary">
            Select a widget to preview it with mock data. This helps in refining the UI without connecting to live services.
          </p>

          <div className="flex items-center gap-4">
            <label htmlFor="widget-select" className="body-sm font-medium text-default">
              Select Widget:
            </label>
            <select
              id="widget-select"
              value={selectedWidget}
              onChange={(e) => setSelectedWidget(e.target.value as keyof typeof WIDGETS)}
              className="px-4 py-2 rounded-lg border border-default bg-surface text-default focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              {Object.keys(WIDGETS).map((key) => (
                <option key={key} value={key}>
                  {key.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main>
          {mockData ? (
            <PreviewWrapper
              key={selectedWidget} // Force re-mount on change
              title={selectedWidget.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              data={mockData.data}
              metadata={mockData.metadata}
            >
              <div className="max-w-[800px] mx-auto">
                <WidgetComponent />
              </div>
            </PreviewWrapper>
          ) : (
            <div className="p-8 text-center text-secondary border border-dashed border-default rounded-xl">
              Widget implementation or mock data missing.
            </div>
          )}
        </main>

        <footer className="pt-8 border-t border-default">
          <h3 className="heading-sm text-default mb-4">Debug Data</h3>
          <div className="bg-surface-secondary p-4 rounded-lg overflow-x-auto">
             <pre className="text-xs text-secondary font-mono">
               {JSON.stringify(mockData, null, 2)}
             </pre>
          </div>
        </footer>
      </div>
    </div>
  );
}
