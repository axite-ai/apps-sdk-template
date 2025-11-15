"use client";

import React from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";
import PlaidRequired from "@/src/components/plaid-required";
import SubscriptionRequired from "@/src/components/subscription-required";

interface Account {
  account_id: string;
  name: string;
  type: string;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string;
  };
}

interface ToolOutput {
  accounts?: Account[];
  featureName?: string;
  message?: string;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export default function AccountBalances() {
  const toolOutput = useWidgetProps();

  if (!toolOutput) {
    return <p>No accounts available</p>;
  }

  // Check if bank connection is required
  if (toolOutput.message === 'Bank connection required') {
    return <PlaidRequired />;
  }

  if (toolOutput.error_message === 'Subscription required' || toolOutput.featureName) {
    return <SubscriptionRequired />;
  }

  if (!toolOutput.accounts) {
    return <p>No accounts available</p>;
  }

  const accounts = toolOutput.accounts || [];

  return (
    <div className="account-list">
      {Array.isArray(accounts) && accounts.map((account: Account) => (
        <div key={account.account_id} className="account">
          <div className="account-name">{account.name}</div>
          <div className="account-type">{account.type} • {account.mask ? `****${account.mask}` : ''}</div>
          <div className="balances">
            {account.balances.current !== null ? (
              <div className="balance-item">
                <div className="balance-label">Current</div>
                <div className="balance-amount">{formatCurrency(account.balances.current, account.balances.iso_currency_code)}</div>
              </div>
            ) : ''}
            {account.balances.available !== null ? (
              <div className="balance-item">
                <div className="balance-label">Available</div>
                <div className="balance-amount">{formatCurrency(account.balances.available, account.balances.iso_currency_code)}</div>
              </div>
            ) : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
