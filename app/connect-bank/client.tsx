'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePlaidLink } from 'react-plaid-link';
import {
  createPlaidLinkToken,
  checkPlanLimit,
  getConnectedItems,
  removeItem
} from './actions';
import { useTheme } from '@/src/use-theme';
import { cn } from '@/lib/utils/cn';
import {
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';

interface PlaidLinkPageProps {
  linkToken: string | null;
  error: string | null;
  updateModeItemId?: string | null;
}

interface ConnectedItem {
  id: string;
  itemId: string;
  institutionId: string | null;
  institutionName: string | null;
  status: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt?: string;
  accountCount?: number;
}

const features = [
  { icon: Building2, text: "Banks, credit cards, investments & more" },
  { icon: Shield, text: "Bank-level encryption & security" },
  { icon: Zap, text: "Real-time balance updates" },
  { icon: TrendingUp, text: "AI-powered spending insights" },
];

export default function ConnectBankClient() {
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isDark = theme === 'dark';

  const [pageData, setPageData] = useState<PlaidLinkPageProps>({
    linkToken: null,
    error: null,
    updateModeItemId: null,
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [connectedItems, setConnectedItems] = useState<ConnectedItem[]>([]);
  const [deletionInfo, setDeletionInfo] = useState<any>(null);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const limitCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const mcpToken = searchParams.get('token');

  // Load connected items
  const loadConnectedItems = async () => {
    try {
      const result = await getConnectedItems(mcpToken || undefined);
      if (result.success) {
        setConnectedItems(result.items);
        setDeletionInfo(result.deletionInfo);
        setPlanInfo(result.planInfo);
      }
    } catch (error) {
      console.error('[Connect Bank] Error loading items:', error);
    }
  };

  useEffect(() => {
    loadConnectedItems();
  }, [mcpToken]);

  // Initialize link token (only when user clicks connect, not on page load)
  const initializeLinkToken = async () => {
    try {
      console.log('[Connect Bank] Fetching Plaid link token...');

      const linkTokenResult = await createPlaidLinkToken(mcpToken || undefined);

      if (!linkTokenResult.success) {
        // Don't block the entire page - just show error on left side
        if (linkTokenResult.error.includes('Account limit reached')) {
          setLimitReached(true);
          return;
        }
        if (linkTokenResult.error.includes('Authentication required')) {
          throw new Error('Please sign in first. Return to ChatGPT and authenticate.');
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

  // Load link token on mount (but don't fail if at limit)
  useEffect(() => {
    initializeLinkToken();
  }, [mcpToken]);

  const { open, ready, exit } = usePlaidLink({
    token: pageData.linkToken || '',
    onSuccess: async (public_token, metadata) => {
      console.log('Plaid Link onSuccess (Multi-Item Link):', { metadata });

      // Stop polling
      if (limitCheckInterval.current) {
        clearInterval(limitCheckInterval.current);
        limitCheckInterval.current = null;
      }

      // Show success and reload items
      setIsSuccess(true);
      setSuccessMessage(
        pageData.updateModeItemId
          ? `${metadata?.institution?.name || 'Account'} has been re-authenticated!`
          : `${metadata?.institution?.name || 'Account'} has been connected!`
      );

      // Reload connected items after a short delay
      setTimeout(() => {
        loadConnectedItems();
        setIsSuccess(false);
        setSuccessMessage(null);
      }, 2000);
    },
    onExit: (err, metadata) => {
      console.log('Plaid Link exit:', err, metadata);

      // Stop polling
      if (limitCheckInterval.current) {
        clearInterval(limitCheckInterval.current);
        limitCheckInterval.current = null;
      }

      if (err != null) {
        setPageData((prev) => ({
          ...prev,
          error: err.display_message || err.error_message || 'Connection failed',
        }));
      } else if (metadata?.status === 'requires_questions') {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          loadConnectedItems();
        }, 2000);
      }
    },
  });

  // Poll for plan limits while Link is open
  useEffect(() => {
    const checkLimit = async () => {
      try {
        const result = await checkPlanLimit(mcpToken || undefined);

        if (result.success && result.limitReached) {
          console.log('[Connect Bank] Plan limit reached, closing Link');
          setLimitReached(true);

          if (exit) {
            exit({ force: true });
          }

          if (limitCheckInterval.current) {
            clearInterval(limitCheckInterval.current);
            limitCheckInterval.current = null;
          }
        } else if (!result.success) {
          console.error('[Connect Bank] Plan limit check failed:', result.error);
        }
      } catch (error) {
        console.error('[Connect Bank] Error checking plan limit:', error);
      }
    };

    if (!ready) return;

    checkLimit();
    limitCheckInterval.current = setInterval(checkLimit, 2000);

    return () => {
      if (limitCheckInterval.current) {
        clearInterval(limitCheckInterval.current);
        limitCheckInterval.current = null;
      }
    };
  }, [ready, exit, mcpToken]);

  const handleConnect = () => {
    if (ready) {
      open();
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    try {
      // Create link token for update mode
      const result = await createPlaidLinkToken(mcpToken || undefined, itemId);

      if (!result.success) {
        setPageData((prev) => ({ ...prev, error: result.error }));
        return;
      }

      setPageData({
        linkToken: result.linkToken,
        error: null,
        updateModeItemId: itemId,
      });

      // Open link in update mode
      if (ready) {
        open();
      }
    } catch (error) {
      console.error('[Connect Bank] Error updating item:', error);
      setPageData((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start update'
      }));
    }
  };

  const handleDeleteItem = async (itemId: string, institutionName: string | null) => {
    if (!confirm(`Are you sure you want to disconnect ${institutionName || 'this account'}?`)) {
      return;
    }

    setDeletingItemId(itemId);
    setPageData((prev) => ({ ...prev, error: null }));

    try {
      const result = await removeItem(itemId, mcpToken || undefined);

      if (result.success) {
        setSuccessMessage(`Successfully disconnected ${institutionName || 'account'}`);
        await loadConnectedItems();
      } else {
        setPageData((prev) => ({ ...prev, error: result.error }));
      }
    } catch (error) {
      setPageData((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect account'
      }));
    } finally {
      setDeletingItemId(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return (
          <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700")}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700")}>
            <Clock className="w-3 h-3 mr-1" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")}>
            <AlertCircle className="w-3 h-3 mr-1" />
            Action Required
          </span>
        );
      default:
        return null;
    }
  };

  // Only show full-page error for critical issues (not limit reached)
  if (pageData.error && !pageData.error.includes('Account limit')) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center p-4", isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100")}>
        <div className={cn("max-w-md w-full rounded-xl shadow-2xl p-8 border", isDark ? "bg-gray-800 border-red-500/30" : "bg-white border-red-300")}>
          <div className="text-center">
            <div className="mb-6">
              <svg className={cn("w-20 h-20 mx-auto", isDark ? "text-red-400" : "text-red-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className={cn("text-2xl font-bold mb-3", isDark ? "text-white" : "text-black")}>Unable to Connect</h1>
            <p className={cn("mb-6", isDark ? "text-red-300" : "text-red-700")}>{pageData.error}</p>
            <button onClick={() => window.close()} className={cn("inline-block font-semibold py-3 px-6 rounded-lg transition-all", isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-black")}>
              Return to ChatGPT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen p-6", isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100")}>
      <div className="max-w-7xl mx-auto">
        <h1 className={cn("text-3xl font-bold mb-8", isDark ? "text-white" : "text-black")}>
          Manage Financial Accounts
        </h1>

        {/* Success Message */}
        {(successMessage || isSuccess) && (
          <div className={cn("mb-6 p-4 rounded-lg border flex items-start", isDark ? "bg-green-500/20 border-green-500/30" : "bg-green-50 border-green-200")}>
            <CheckCircle className={cn("w-5 h-5 mr-3 shrink-0 mt-0.5", isDark ? "text-green-400" : "text-green-600")} />
            <p className={cn("text-sm font-medium", isDark ? "text-green-400" : "text-green-800")}>
              {successMessage || 'Account connected successfully!'}
            </p>
          </div>
        )}

        {/* Limit Reached Message */}
        {limitReached && (
          <div className={cn("mb-6 p-4 rounded-lg border flex items-start", isDark ? "bg-yellow-500/20 border-yellow-500/30" : "bg-yellow-50 border-yellow-200")}>
            <AlertCircle className={cn("w-5 h-5 mr-3 shrink-0 mt-0.5", isDark ? "text-yellow-400" : "text-yellow-600")} />
            <div className="flex-1">
              <p className={cn("text-sm font-medium", isDark ? "text-yellow-400" : "text-yellow-800")}>
                Account limit reached ({planInfo?.current}/{planInfo?.maxFormatted})
              </p>
              <p className={cn("text-xs mt-1", isDark ? "text-yellow-400/80" : "text-yellow-700")}>
                Remove an account or upgrade your plan to connect more.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Connect New Account */}
          <div className={cn("rounded-xl shadow-lg p-6 border", isDark ? "bg-gray-800 border-green-500/30" : "bg-white border-green-300")}>
            <div className="flex items-start mb-6">
              <div className={cn("p-3 rounded-xl mr-4 shrink-0", isDark ? "bg-green-500/20" : "bg-green-100")}>
                <Plus className={cn("h-6 w-6", isDark ? "text-green-400" : "text-green-600")} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Connect New Account</h2>
                <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                  {planInfo ? `${planInfo.current} of ${planInfo.maxFormatted} accounts connected` : 'Loading...'}
                </p>
              </div>
            </div>

            {/* Features */}
            <div className={cn("mb-6 p-4 rounded-lg border", isDark ? "bg-gray-900/50 border-gray-700" : "bg-gray-50 border-gray-200")}>
              <p className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-black")}>
                What you'll get:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <feature.icon className={cn("w-4 h-4 mr-2 mt-0.5 shrink-0", isDark ? "text-green-400" : "text-green-600")} />
                    <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Progress */}
            {planInfo && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                    {planInfo.plan.charAt(0).toUpperCase() + planInfo.plan.slice(1)} Plan
                  </span>
                  <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                    {planInfo.current} / {planInfo.maxFormatted}
                  </span>
                </div>
                <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-gray-700" : "bg-gray-200")}>
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min((planInfo.current / planInfo.max) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={!ready || limitReached}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-medium transition-all shadow-lg",
                !ready || limitReached
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              )}
            >
              {limitReached ? 'Limit Reached' : !ready ? 'Loading...' : 'Connect Bank Account'}
            </button>

            {limitReached && (
              <a
                href="/pricing"
                target="_blank"
                className="mt-3 w-full inline-block text-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg"
              >
                Upgrade Plan
              </a>
            )}
          </div>

          {/* Right: Connected Accounts */}
          <div className={cn("rounded-xl shadow-lg p-6 border", isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start">
                <div className={cn("p-3 rounded-xl mr-4 shrink-0", isDark ? "bg-blue-500/20" : "bg-blue-100")}>
                  <Building2 className={cn("h-6 w-6", isDark ? "text-blue-400" : "text-blue-600")} />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Connected Accounts</h2>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                    {connectedItems.length} account{connectedItems.length !== 1 ? 's' : ''} connected
                  </p>
                </div>
              </div>
            </div>

            {/* Deletion Rate Limit Warning */}
            {deletionInfo && !deletionInfo.canDelete && (
              <div className={cn("mb-4 p-3 rounded-lg border", isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200")}>
                <div className="flex items-start">
                  <Clock className={cn("w-4 h-4 mr-2 shrink-0 mt-0.5", isDark ? "text-yellow-400" : "text-yellow-600")} />
                  <p className={cn("text-xs", isDark ? "text-yellow-400/80" : "text-yellow-700")}>
                    Next deletion available in {deletionInfo.daysUntilNext} days
                  </p>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {connectedItems.length === 0 ? (
                <div className={cn("text-center py-12", isDark ? "text-gray-500" : "text-gray-400")}>
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No accounts connected yet</p>
                  <p className="text-xs mt-1">Connect your first account to get started</p>
                </div>
              ) : (
                connectedItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      isDark ? "bg-gray-900/50 border-gray-700" : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-600")} />
                          <p className="font-medium">{item.institutionName || 'Financial Institution'}</p>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                          {item.accountCount !== undefined && item.accountCount > 0
                            ? `${item.accountCount} ${item.accountCount === 1 ? 'account' : 'accounts'} • `
                            : ''}
                          Connected {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'recently'}
                        </p>
                        {item.status === 'error' && item.errorMessage && (
                          <p className={cn("text-xs mt-2", isDark ? "text-red-400" : "text-red-600")}>
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {item.status === 'error' && (
                          <button
                            onClick={() => handleUpdateItem(item.id)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              isDark ? "hover:bg-blue-500/20 text-blue-400" : "hover:bg-blue-50 text-blue-600"
                            )}
                            title="Re-authenticate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id, item.institutionName)}
                          disabled={deletingItemId === item.id || (deletionInfo && !deletionInfo.canDelete)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            deletingItemId === item.id
                              ? "opacity-50 cursor-not-allowed"
                              : deletionInfo && !deletionInfo.canDelete
                              ? "opacity-30 cursor-not-allowed"
                              : isDark
                              ? "hover:bg-red-500/20 text-red-400"
                              : "hover:bg-red-50 text-red-600"
                          )}
                          title={
                            deletionInfo && !deletionInfo.canDelete
                              ? `Next deletion available in ${deletionInfo.daysUntilNext} days`
                              : "Disconnect account"
                          }
                        >
                          {deletingItemId === item.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
