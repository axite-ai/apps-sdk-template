import { LoadingIndicator } from "@openai/apps-sdk-ui/components/Indicator";
import { cn } from "@/lib/utils/cn";

interface WidgetLoadingSkeletonProps {
  className?: string;
}

export default function WidgetLoadingSkeleton({ className }: WidgetLoadingSkeletonProps = {}) {
  return (
    <div
      className={cn(
        "w-full h-full min-h-[200px] flex flex-col items-center justify-center p-6 bg-surface rounded-2xl border-none",
        className
      )}
    >
      <LoadingIndicator size="30" className="mb-4 text-secondary" />
      <div className="space-y-2 w-full max-w-[200px]">
        <div className="h-4 w-full bg-surface-secondary rounded-full animate-pulse" />
        <div className="h-4 w-2/3 bg-surface-secondary rounded-full animate-pulse mx-auto" />
      </div>
    </div>
  );
}
