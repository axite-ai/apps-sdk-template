import { Suspense } from 'react';
import ConnectBankClient from './client';
import { cn } from '@/lib/utils/cn';

// This is a server component that wraps the client component in a Suspense boundary
// This is the standard pattern to fix the "useSearchParams() should be wrapped in a suspense boundary" error
export default function ConnectBankPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConnectBankClient />
    </Suspense>
  );
}

// Basic loading fallback to match the page's theme
const LoadingFallback = () => {
  // Note: Can't use useTheme() hook here as it's a server component context
  // This fallback will be simple and theme-agnostic.
  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900")}>
      <div className="flex flex-col items-center">
        <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" viewBox="0 0 24 24">
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
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Loading Bank Connector...
        </p>
      </div>
    </div>
  );
};