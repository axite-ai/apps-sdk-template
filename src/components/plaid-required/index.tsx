"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check, Lock, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useTheme } from "@/src/use-theme";

interface WidgetProps extends Record<string, unknown> {
  baseUrl?: string;
  userId?: string;
  message?: string;
  mcpToken?: string;
}

const features = [
  { icon: DollarSign, text: "Real-time account balances" },
  { icon: BarChart3, text: "Transaction history & insights" },
  { icon: TrendingUp, text: "AI-powered spending analysis" },
  { icon: Check, text: "Account health monitoring" },
];

export default function PlaidRequired() {
  const props = useWidgetProps<WidgetProps>();
  const theme = useTheme();
  const isDark = theme === "dark";
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    console.log("[PlaidRequired Widget] Opening /connect-bank with MCP token");

    if (!props?.mcpToken) {
      console.error("[PlaidRequired Widget] No MCP token in props");
      setError("Authentication token not available. Please try again.");
      return;
    }

    // Open the connect-bank page with the token in the URL
    const baseUrl = props.baseUrl || window.location.origin;
    const connectUrl = `${baseUrl}/connect-bank?token=${encodeURIComponent(props.mcpToken)}`;

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      connectUrl,
      "plaid-connect",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed) {
      console.error("[PlaidRequired Widget] Popup blocked - please allow popups");
      setError("Popup blocked. Please allow popups and try again.");
    } else {
      console.log("[PlaidRequired Widget] Popup opened successfully");
    }
  };

  // Listen for success messages from the popup window
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      const baseUrl = props?.baseUrl || window.location.origin;
      if (!event.origin.includes(new URL(baseUrl).hostname)) {
        return;
      }

      if (event.data.type === "plaid-success") {
        console.log("[PlaidRequired Widget] Received success message from popup");
        setSuccess(
          `Successfully connected ${event.data.institution || "your bank"}! You can now use all financial features.`
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [props?.baseUrl]);

  return (
    <div
      className={cn(
        "antialiased w-full p-6 rounded-2xl border shadow-lg",
        isDark
          ? "bg-gradient-to-br from-gray-800 to-gray-900 border-green-500/30 text-white"
          : "bg-gradient-to-br from-gray-50 to-gray-100 border-green-300 text-black"
      )}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-start mb-6">
          <div className={cn(
            "p-3 rounded-xl mr-4 flex-shrink-0",
            isDark ? "bg-green-500/20" : "bg-green-100"
          )}>
            <CreditCard strokeWidth={1.5} className={cn("h-6 w-6", isDark ? "text-green-400" : "text-green-600")} />
          </div>
          <div className="flex-1">
            <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-black")}>
              Connect Your Bank Account
            </h2>
            <p className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
              Link your financial accounts to access this feature
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-4 p-3 border rounded-xl text-sm",
              isDark
                ? "bg-green-500/20 border-green-500/50 text-green-300"
                : "bg-green-50 border-green-300 text-green-700"
            )}
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-4 p-3 border rounded-xl text-sm",
              isDark
                ? "bg-red-500/20 border-red-500/50 text-red-300"
                : "bg-red-50 border-red-300 text-red-700"
            )}
          >
            {error}
          </motion.div>
        )}

        {/* Features List */}
        <div className={cn(
          "rounded-xl p-5 mb-6",
          isDark ? "bg-gray-800/50" : "bg-gray-100"
        )}>
          <h3 className={cn("font-semibold mb-4 text-sm", isDark ? "text-gray-200" : "text-gray-800")}>
            What You'll Get:
          </h3>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn("flex items-center text-sm", isDark ? "text-gray-300" : "text-gray-700")}
              >
                <div className={cn(
                  "p-1.5 rounded-lg mr-3 flex-shrink-0",
                  isDark ? "bg-green-500/20" : "bg-green-100"
                )}>
                  <feature.icon strokeWidth={1.5} className={cn("h-4 w-4", isDark ? "text-green-400" : "text-green-600")} />
                </div>
                <span>{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className={cn(
          "border rounded-xl p-4 mb-6",
          isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"
        )}>
          <div className="flex items-start">
            <Lock strokeWidth={1.5} className={cn("h-4 w-4 mr-2 flex-shrink-0 mt-0.5", isDark ? "text-blue-400" : "text-blue-600")} />
            <p className={cn("text-xs", isDark ? "text-blue-200" : "text-blue-700")}>
              Your data is encrypted and secured by Plaid, trusted by thousands of financial apps.
              We never see your login credentials.
            </p>
          </div>
        </div>

        {/* Connect Button */}
        <motion.button
          id="connect-btn"
          onClick={handleConnect}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg"
        >
          Connect Bank Account
        </motion.button>

        {/* Footer Notes */}
        <div className="mt-4 text-center space-y-1">
          <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
            Opens in a new window for secure authentication
          </p>
          <p className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-500")}>
            Powered by Plaid
          </p>
        </div>
      </motion.div>
    </div>
  );
}
