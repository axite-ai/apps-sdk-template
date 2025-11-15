"use client";

import React from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";

interface WidgetProps extends Record<string, unknown> {
  baseUrl?: string;
  userId?: string;
  message?: string;
  mcpToken?: string;
}

export default function PlaidRequired() {
  const props = useWidgetProps<WidgetProps>();
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleConnect = () => {
    console.log('[PlaidRequired Widget] Opening /connect-bank with MCP token');

    if (!props.mcpToken) {
      console.error('[PlaidRequired Widget] No MCP token in props');
      setError('Authentication token not available. Please try again.');
      return;
    }

    // Open the connect-bank page with the token in the URL
    const baseUrl = props.baseUrl || window.location.origin;
    const connectUrl = `${baseUrl}/connect-bank?token=${encodeURIComponent(props.mcpToken)}`;

    const width = 600;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);

    const popup = window.open(
      connectUrl,
      'plaid-connect',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed) {
      console.error('[PlaidRequired Widget] Popup blocked - please allow popups');
      setError('Popup blocked. Please allow popups and try again.');
    } else {
      console.log('[PlaidRequired Widget] Popup opened successfully');
    }
  };

  // Listen for success messages from the popup window
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      const baseUrl = props.baseUrl || window.location.origin;
      if (!event.origin.includes(new URL(baseUrl).hostname)) {
        return;
      }

      if (event.data.type === 'plaid-success') {
        console.log('[PlaidRequired Widget] Received success message from popup');
        setSuccess(`Successfully connected ${event.data.institution || 'your bank'}! You can now use all financial features.`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [props.baseUrl]);

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 text-white shadow-xl">
      <div>
        <div className="flex items-start mb-4">
          <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">Connect Your Bank Account</h2>
            <p className="text-sm text-gray-300">Link your financial accounts to access this feature</p>
          </div>
        </div>

        {success && <div className="mb-3 p-2 bg-green-500/20 border border-green-500/50 rounded text-green-300 text-xs">{success}</div>}
        {error && <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-xs">{error}</div>}

        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm">What You&apos;ll Get:</h3>
          <ul className="space-y-2">
            <li className="flex items-start text-xs text-gray-300">
              <svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Real-time account balances</span>
            </li>
            <li className="flex items-start text-xs text-gray-300">
              <svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Transaction history and insights</span>
            </li>
            <li className="flex items-start text-xs text-gray-300">
              <svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>AI-powered spending analysis</span>
            </li>
            <li className="flex items-start text-xs text-gray-300">
              <svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Account health monitoring</span>
            </li>
          </ul>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs text-blue-200">
              Your data is encrypted and secured by Plaid, trusted by thousands of financial apps. We never see your login credentials.
            </p>
          </div>
        </div>

        <button
          id="connect-btn"
          onClick={handleConnect}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg"
        >
          Connect Bank Account
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          Opens in a new window for secure authentication
        </p>

        <p className="text-xs text-gray-500 text-center mt-2">
          Powered by Plaid
        </p>
      </div>
    </div>
  );
}
