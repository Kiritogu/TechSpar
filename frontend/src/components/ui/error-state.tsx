import { AlertTriangle, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

// 通用行内错误态：数据请求失败时的兜底提示 + 重试。
// 与各页已有的空态/加载骨架并列，避免「静默失败 → 误显示为空」的误导。
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center px-6 py-12", className)}>
      <div className="mx-auto w-full max-w-md rounded-panel border border-red/20 bg-red/5 px-6 py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red/10 text-red">
          <AlertTriangle size={22} />
        </div>
        <div className="mt-4 text-base font-semibold text-text">加载失败</div>
        <div className="mt-2 text-sm leading-6 text-dim">
          {message || "数据加载失败，请检查网络后重试。"}
        </div>
        {onRetry && (
          <Button variant="outline" className="mt-5" onClick={onRetry}>
            <RefreshCw size={15} className="mr-1.5" /> 重试
          </Button>
        )}
      </div>
    </div>
  );
}
