"use client";

import React from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";
import PlaidRequired from "@/src/components/plaid-required";
import SubscriptionRequired from "@/src/components/subscription-required";

interface Account {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string;
  };
}

interface Holding {
  account_id: string;
  security_id: string;
  cost_basis: number | null;
  institution_price: number;
  institution_price_as_of: string | null;
  institution_value: number;
  iso_currency_code: string;
  quantity: number;
  unofficial_currency_code: string | null;
}

interface Security {
  security_id: string;
  isin: string | null;
  cusip: string | null;
  sedol: string | null;
  institution_security_id: string | null;
  institution_id: string | null;
  proxy_security_id: string | null;
  name: string;
  ticker_symbol: string | null;
  is_cash_equivalent: boolean;
  type: string;
  close_price: number | null;
  close_price_as_of: string | null;
  iso_currency_code: string;
  unofficial_currency_code: string | null;
}

interface ToolOutput {
  accounts?: Account[];
  holdings?: Holding[];
  securities?: Security[];
  totalValue?: number;
  featureName?: string;
  message?: string;
  error_message?: string;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function Investments() {
  const toolOutput = useWidgetProps();

  if (!toolOutput) {
    return <p>No investment data available</p>;
  }

  // Check if bank connection is required
  if (toolOutput.message === 'Bank connection required') {
    return <PlaidRequired />;
  }

  if (toolOutput.error_message === 'Subscription required' || toolOutput.featureName) {
    return <SubscriptionRequired />;
  }

  if (!toolOutput.holdings || !toolOutput.securities) {
    return <p>No investment holdings available</p>;
  }

  const accounts: Account[] = (toolOutput.accounts || []) as Account[];
  const holdings: Holding[] = (toolOutput.holdings || []) as Holding[];
  const securities: Security[] = (toolOutput.securities || []) as Security[];
  const totalValue: number = (toolOutput.totalValue || 0) as number;

  // Create a map of securities for quick lookup
  const securitiesMap = new Map<string, Security>(
    securities.map((sec: Security) => [sec.security_id, sec])
  );

  // Group holdings by account
  const holdingsByAccount = holdings.reduce((acc: Record<string, Holding[]>, holding: Holding) => {
    if (!acc[holding.account_id]) {
      acc[holding.account_id] = [];
    }
    acc[holding.account_id].push(holding);
    return acc;
  }, {} as Record<string, Holding[]>);

  return (
    <div className="investments-container">
      <div className="portfolio-summary">
        <div className="summary-card">
          <div className="summary-label">Total Portfolio Value</div>
          <div className="summary-value">{formatCurrency(totalValue)}</div>
        </div>
        <div className="summary-stats">
          <div className="stat-item">
            <div className="stat-label">Accounts</div>
            <div className="stat-value">{accounts.length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Holdings</div>
            <div className="stat-value">{holdings.length}</div>
          </div>
        </div>
      </div>

      <div className="accounts-list">
        {accounts.map((account: Account) => {
          const accountHoldings: Holding[] = holdingsByAccount[account.account_id] || [];
          const accountValue = accountHoldings.reduce((sum: number, h: Holding) => sum + h.institution_value, 0);

          return (
            <div key={account.account_id} className="investment-account">
              <div className="account-header">
                <div className="account-info">
                  <div className="account-name">{account.name}</div>
                  <div className="account-type">
                    {account.subtype || account.type} • {account.mask ? `****${account.mask}` : ''}
                  </div>
                </div>
                <div className="account-value">
                  {formatCurrency(accountValue, account.balances.iso_currency_code)}
                </div>
              </div>

              <div className="holdings-list">
                {accountHoldings.map((holding: Holding, idx: number) => {
                  const security: Security | undefined = securitiesMap.get(holding.security_id);
                  if (!security) return null;

                  const gainLoss = holding.cost_basis
                    ? holding.institution_value - (holding.cost_basis * holding.quantity)
                    : null;
                  const gainLossPercent = holding.cost_basis && holding.cost_basis > 0
                    ? ((holding.institution_price - holding.cost_basis) / holding.cost_basis) * 100
                    : null;

                  return (
                    <div key={`${holding.account_id}-${holding.security_id}-${idx}`} className="holding-item">
                      <div className="holding-main">
                        <div className="security-info">
                          <div className="security-name">{security.name}</div>
                          <div className="security-details">
                            {security.ticker_symbol && (
                              <span className="ticker">{security.ticker_symbol}</span>
                            )}
                            <span className="security-type">{security.type}</span>
                            <span className="quantity">{holding.quantity} shares</span>
                          </div>
                        </div>
                        <div className="holding-value">
                          <div className="current-value">
                            {formatCurrency(holding.institution_value, holding.iso_currency_code)}
                          </div>
                          {gainLoss !== null && (
                            <div className={`gain-loss ${gainLoss >= 0 ? 'positive' : 'negative'}`}>
                              {formatCurrency(Math.abs(gainLoss), holding.iso_currency_code)}
                              {gainLossPercent !== null && ` (${formatPercent(gainLossPercent)})`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="holding-details">
                        <div className="detail-item">
                          <span className="detail-label">Price:</span>
                          <span className="detail-value">
                            {formatCurrency(holding.institution_price, holding.iso_currency_code)}
                          </span>
                        </div>
                        {holding.cost_basis && (
                          <div className="detail-item">
                            <span className="detail-label">Cost Basis:</span>
                            <span className="detail-value">
                              {formatCurrency(holding.cost_basis, holding.iso_currency_code)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .investments-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 16px;
          max-width: 800px;
        }

        .portfolio-summary {
          margin-bottom: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .summary-card {
          margin-bottom: 16px;
        }

        .summary-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .summary-value {
          font-size: 32px;
          font-weight: 700;
        }

        .summary-stats {
          display: flex;
          gap: 24px;
        }

        .stat-item {
          flex: 1;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 600;
        }

        .accounts-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .investment-account {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }

        .account-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .account-info {
          flex: 1;
        }

        .account-name {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .account-type {
          font-size: 13px;
          color: #6b7280;
        }

        .account-value {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }

        .holdings-list {
          display: flex;
          flex-direction: column;
        }

        .holding-item {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .holding-item:last-child {
          border-bottom: none;
        }

        .holding-main {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .security-info {
          flex: 1;
        }

        .security-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .security-details {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #6b7280;
        }

        .ticker {
          font-weight: 600;
          color: #4f46e5;
        }

        .holding-value {
          text-align: right;
        }

        .current-value {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .gain-loss {
          font-size: 12px;
          font-weight: 600;
        }

        .gain-loss.positive {
          color: #059669;
        }

        .gain-loss.negative {
          color: #dc2626;
        }

        .holding-details {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #f3f4f6;
        }

        .detail-item {
          display: flex;
          gap: 4px;
          font-size: 12px;
        }

        .detail-label {
          color: #6b7280;
        }

        .detail-value {
          color: #111827;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
