import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/src/use-theme";

interface WidgetLoadingSkeletonProps {
  className?: string;
}

export default function WidgetLoadingSkeleton({ className }: WidgetLoadingSkeletonProps = {}) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "antialiased w-full p-6 rounded-2xl border shadow-lg",
        isDark
          ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700"
          : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
        className
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start flex-1">
          <div
            className={cn(
              "w-12 h-12 rounded-xl mr-4 shrink-0 animate-pulse",
              isDark ? "bg-gray-700" : "bg-gray-200"
            )}
          />
          <div className="flex-1">
            <div
              className={cn(
                "h-6 w-48 rounded mb-2 animate-pulse",
                isDark ? "bg-gray-700" : "bg-gray-200"
              )}
            />
            <div
              className={cn(
                "h-4 w-32 rounded animate-pulse",
                isDark ? "bg-gray-700" : "bg-gray-200"
              )}
            />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4 mb-6">
        <div
          className={cn(
            "h-20 rounded-lg animate-pulse",
            isDark ? "bg-gray-700" : "bg-gray-200"
          )}
        />
        <div
          className={cn(
            "h-20 rounded-lg animate-pulse",
            isDark ? "bg-gray-700" : "bg-gray-200"
          )}
        />
      </div>

      {/* Progress bar skeleton */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div
            className={cn(
              "h-4 w-24 rounded animate-pulse",
              isDark ? "bg-gray-700" : "bg-gray-200"
            )}
          />
          <div
            className={cn(
              "h-4 w-16 rounded animate-pulse",
              isDark ? "bg-gray-700" : "bg-gray-200"
            )}
          />
        </div>
        <div
          className={cn(
            "h-2 rounded-full overflow-hidden",
            isDark ? "bg-gray-700" : "bg-gray-200"
          )}
        >
          <div className="h-full w-3/4 bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Action button skeleton */}
      <div
        className={cn(
          "h-12 rounded-lg animate-pulse",
          isDark ? "bg-gray-700" : "bg-gray-200"
        )}
      />
    </div>
  );
}
