'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePlaidLink } from 'react-plaid-link';
import { createPlaidLinkToken, exchangePlaidPublicToken } from './actions';
import { useTheme } from '@/src/use-theme';
import { cn } from '@/lib/utils/cn';

interface PlaidLinkPageProps {
  linkToken: string | null;
  error: string | null;
  institutionName?: string;
}

export default function ConnectBankPage() {
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isDark = theme === 'dark';
  const [pageData, setPageData] = useState<PlaidLinkPageProps>({
    linkToken: null,
    error: null,
  });
  const [isExchanging, setIsExchanging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Initialize the page - fetch Plaid link token
    const initializePage = async () => {
      try {
        console.log('[Connect Bank] Fetching Plaid link token...');

        // Get the MCP token from URL if present
        const token = searchParams.get('token');
        console.log('[Connect Bank] Token from URL:', token ? 'present' : 'missing');

        const linkTokenResult = await createPlaidLinkToken(token || undefined);

        if (!linkTokenResult.success) {
          // If authentication error, provide helpful message
          if (linkTokenResult.error.includes('Authentication required')) {
            throw new Error(
              'Please sign in first. Return to ChatGPT and authenticate.'
            );
          }
          throw new Error(linkTokenResult.error);
        }

        setPageData({ linkToken: linkTokenResult.linkToken, error: null });
      } catch (error) {
        setPageData({
          linkToken: null,
          error: error instanceof Error ? error.message : 'Failed to load'
        });
      }
    };

    initializePage();
  }, [searchParams]);

  const { open, ready } = usePlaidLink({
    token: pageData.linkToken || '',
    onSuccess: async (public_token, metadata) => {
      // With Multi-Item Link, onSuccess may be called with empty data
      // Actual items are processed via webhooks (SESSION_FINISHED, ITEM_ADD_RESULT)
      console.log('Plaid Link onSuccess (Multi-Item Link - processing via webhooks):', {
        hasPublicToken: !!public_token,
        metadata,
      });

      // Show success immediately - webhooks will process the items
      setIsSuccess(true);
      setPageData((prev) => ({
        ...prev,
        institutionName: metadata?.institution?.name || 'your bank account(s)',
      }));
    },
    onExit: (err, metadata) => {
      console.log('Plaid Link exit:', err, metadata);
      if (err != null) {
        setPageData((prev) => ({
          ...prev,
          error: err.display_message || err.error_message || 'Connection failed',
        }));
      } else if (metadata?.status === 'requires_questions') {
        // User exited after adding accounts successfully
        setIsSuccess(true);
        setPageData((prev) => ({
          ...prev,
          institutionName: 'your bank account(s)',
        }));
      }
    },
  });

  const handleConnect = () => {
    if (ready) {
      open();
    }
  };

  if (isSuccess) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"
      )}>
        <div className={cn(
          "max-w-md w-full rounded-xl shadow-2xl p-8 border",
          isDark ? "bg-gray-800 border-green-500/30" : "bg-white border-green-300"
        )}>
          <div className="text-center">
            <div className="mb-6">
              <svg
                className={cn("w-20 h-20 mx-auto", isDark ? "text-green-400" : "text-green-600")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className={cn("text-2xl font-bold mb-3", isDark ? "text-white" : "text-black")}>
              Accounts Connected!
            </h1>
            <p className={cn("mb-6", isDark ? "text-gray-300" : "text-gray-700")}>
              {pageData.institutionName && pageData.institutionName !== 'your bank account(s)'
                ? `${pageData.institutionName} has been securely connected.`
                : 'Your bank accounts have been securely connected.'}
            </p>
            <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-gray-600")}>
              Your accounts are being processed. You can now return to ChatGPT and ask about
              your account balances, transactions, and spending insights.
            </p>
            <p className={cn("text-xs mb-6", isDark ? "text-gray-500" : "text-gray-500")}>
              💡 Tip: You can connect multiple accounts from different banks in one session!
              Just click "Connect Bank Account" again to add more.
            </p>
            <button
              onClick={() => window.close()}
              className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg"
            >
              Return to ChatGPT
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pageData.error) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"
      )}>
        <div className={cn(
          "max-w-md w-full rounded-xl shadow-2xl p-8 border",
          isDark ? "bg-gray-800 border-red-500/30" : "bg-white border-red-300"
        )}>
          <div className="text-center">
            <div className="mb-6">
              <svg
                className={cn("w-20 h-20 mx-auto", isDark ? "text-red-400" : "text-red-600")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className={cn("text-2xl font-bold mb-3", isDark ? "text-white" : "text-black")}>
              Unable to Connect
            </h1>
            <p className={cn("mb-6", isDark ? "text-red-300" : "text-red-700")}>{pageData.error}</p>
            <a
              href="https://chatgpt.com"
              className={cn(
                "inline-block font-semibold py-3 px-6 rounded-lg transition-all",
                isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-black"
              )}
            >
              Return to ChatGPT
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isExchanging) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"
      )}>
        <div className={cn(
          "max-w-md w-full rounded-xl shadow-2xl p-8 border",
          isDark ? "bg-gray-800 border-blue-500/30" : "bg-white border-blue-300"
        )}>
          <div className="text-center">
            <div className="mb-6">
              <svg
                className={cn("animate-spin h-20 w-20 mx-auto", isDark ? "text-blue-400" : "text-blue-600")}
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-black")}>
              Connecting Your Bank...
            </h2>
            <p className={cn(isDark ? "text-gray-400" : "text-gray-600")}>
              Please wait while we securely connect your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4",
      isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"
    )}>
      <div className={cn(
        "max-w-md w-full rounded-xl shadow-2xl p-8 border",
        isDark ? "bg-gray-800 border-green-500/30" : "bg-white border-green-300"
      )}>
        <div className="flex items-start mb-6">
          <svg
            className={cn("w-8 h-8 mr-4 flex-shrink-0", isDark ? "text-green-400" : "text-green-600")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <div>
            <h1 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-black")}>
              Connect Your Bank Account
            </h1>
            <p className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
              Securely link your bank to access your financial data
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className={cn(
          "mb-6 p-4 rounded-lg border",
          isDark ? "bg-gray-900/50 border-gray-700" : "bg-gray-50 border-gray-200"
        )}>
          <p className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-black")}>
            Why connect your bank?
          </p>
          <ul className="space-y-2">
            {[
              'Real-time account balances and transactions',
              'Automated spending insights and analytics',
              'Bank-level security and encryption',
            ].map((benefit, i) => (
              <li key={i} className={cn("flex items-center text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                <svg
                  className={cn("w-4 h-4 mr-2 flex-shrink-0", isDark ? "text-green-400" : "text-green-600")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={!ready}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-4 px-6 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ready ? 'Connect Bank Account' : 'Loading...'}
        </button>

        {/* Security notice */}
        <div className={cn(
          "mt-6 p-3 border rounded-lg",
          isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"
        )}>
          <div className="flex items-start">
            <svg
              className={cn("w-4 h-4 mr-2 flex-shrink-0 mt-0.5", isDark ? "text-blue-400" : "text-blue-600")}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className={cn("text-xs", isDark ? "text-blue-300" : "text-blue-700")}>
              Your credentials are encrypted and never stored. We use Plaid, a
              trusted financial data provider used by millions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
