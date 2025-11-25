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
  Business,
  Plus,
  Trash,
  Reload,
  Error as ErrorIcon,
  CheckCircle,
  Clock,
  Trending,
  ShieldCheck,
  Flash
} from '@openai/apps-sdk-ui/components/Icon';
import { Button, ButtonLink } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";

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
  { icon: Business, text: "Banks, credit cards, investments & more" },
  { icon: ShieldCheck, text: "Bank-level encryption & security" },
  { icon: Flash, text: "Real-time balance updates" },
  { icon: Trending, text: "AI-powered spending insights" },
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
          <Badge color="success" size="sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge color="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            Connecting...
          </Badge>
        );
      case 'error':
        return (
          <Badge color="danger" size="sm">
            <ErrorIcon className="w-3 h-3 mr-1" />
            Action Required
          </Badge>
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
          <div className="mb-6 p-4 rounded-lg border flex items-start bg-success-soft border-success-surface">
            <CheckCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-success" />
            <p className="text-sm font-medium text-success-soft">
              {successMessage || 'Account connected successfully!'}
            </p>
          </div>
        )}

        {/* Limit Reached Message */}
        {limitReached && (
          <div className="mb-6 p-4 rounded-lg border flex items-start bg-warning-soft border-warning-surface">
            <ErrorIcon className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">
                Account limit reached ({planInfo?.current}/{planInfo?.maxFormatted})
              </p>
              <p className="text-xs mt-1 text-warning-soft">
                Remove an account or upgrade your plan to connect more.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Connect New Account */}
          <div className="rounded-xl shadow-lg p-6 border bg-surface border-subtle">
            <div className="flex items-start mb-6">
              <div className="p-3 rounded-xl mr-4 shrink-0 bg-success-soft">
                <Plus className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1 text-default">Connect New Account</h2>
                <p className="text-sm text-secondary">
                  {planInfo ? `${planInfo.current} of ${planInfo.maxFormatted} accounts connected` : 'Loading...'}
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6 p-4 rounded-lg border bg-surface-secondary border-subtle">
              <p className="text-sm font-semibold mb-3 text-default">
                What you'll get:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <feature.icon className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-success" />
                    <span className="text-sm text-secondary">
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
                  <span className="text-sm font-medium text-secondary">
                    {planInfo.plan.charAt(0).toUpperCase() + planInfo.plan.slice(1)} Plan
                  </span>
                  <span className="text-sm text-tertiary">
                    {planInfo.current} / {planInfo.maxFormatted}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-surface-tertiary">
                  <div
                    className="h-full bg-success transition-all duration-300"
                    style={{
                      width: `${Math.min((planInfo.current / planInfo.max) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={!ready || limitReached}
              color="success"
              size="xl"
              block
            >
              {limitReached ? 'Limit Reached' : !ready ? 'Loading...' : 'Connect Bank Account'}
            </Button>

            {limitReached && (
              <ButtonLink
                href="/pricing"
                color="primary"
                size="xl"
                block
                className="mt-3"
              >
                Upgrade Plan
              </ButtonLink>
            )}
          </div>

          {/* Right: Connected Accounts */}
          <div className="rounded-xl shadow-lg p-6 border bg-surface border-subtle">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start">
                <div className="p-3 rounded-xl mr-4 shrink-0 bg-info-soft">
                  <Business className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1 text-default">Connected Accounts</h2>
                  <p className="text-sm text-secondary">
                    {connectedItems.length} account{connectedItems.length !== 1 ? 's' : ''} connected
                  </p>
                </div>
              </div>
            </div>

            {/* Deletion Rate Limit Warning */}
            {deletionInfo && !deletionInfo.canDelete && (
              <div className="mb-4 p-3 rounded-lg border bg-warning-soft border-warning-surface">
                <div className="flex items-start">
                  <Clock className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-warning" />
                  <p className="text-xs text-warning-soft">
                    Next deletion available in {deletionInfo.daysUntilNext} days
                  </p>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {connectedItems.length === 0 ? (
                <div className="text-center py-12">
                  <Business className="w-12 h-12 mx-auto mb-3 opacity-50 text-tertiary" />
                  <p className="text-sm text-secondary">No accounts connected yet</p>
                  <p className="text-xs mt-1 text-tertiary">Connect your first account to get started</p>
                </div>
              ) : (
                connectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border bg-surface-secondary border-subtle"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Business className="w-4 h-4 text-secondary" />
                          <p className="font-medium text-default">{item.institutionName || 'Financial Institution'}</p>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-xs text-secondary">
                          {item.accountCount !== undefined && item.accountCount > 0
                            ? `${item.accountCount} ${item.accountCount === 1 ? 'account' : 'accounts'} • `
                            : ''}
                          Connected {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'recently'}
                        </p>
                        {item.status === 'error' && item.errorMessage && (
                          <p className="text-xs mt-2 text-danger">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {item.status === 'error' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            color="info"
                            onClick={() => handleUpdateItem(item.id)}
                            title="Re-authenticate"
                          >
                            <Reload className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          color="danger"
                          onClick={() => handleDeleteItem(item.id, item.institutionName)}
                          disabled={deletingItemId === item.id || (deletionInfo && !deletionInfo.canDelete)}
                          title={
                            deletionInfo && !deletionInfo.canDelete
                              ? `Next deletion available in ${deletionInfo.daysUntilNext} days`
                              : "Disconnect account"
                          }
                        >
                          {deletingItemId === item.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                          ) : (
                            <Trash className="w-4 h-4" />
                          )}
                        </Button>
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
