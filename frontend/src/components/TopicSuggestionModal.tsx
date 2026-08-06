import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, EyeOff } from "lucide-react";
import {
  applyTopicSuggestions,
  getTopics,
  type TopicSuggestion,
} from "@/api/interview";
import { getTopicIcon } from "@/utils/topicIcons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  open: boolean;
  suggestion: TopicSuggestion | null;
  onClose: () => void;
  onApplied: () => void;
}

interface TopicMeta {
  name?: string;
  icon?: string;
  source?: string;
  hidden?: boolean;
}

export default function TopicSuggestionModal({
  open,
  suggestion,
  onClose,
  onApplied,
}: Props) {
  const [allTopics, setAllTopics] = useState<Record<string, TopicMeta>>({});
  const [keepKeys, setKeepKeys] = useState<Set<string>>(new Set());
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open || !suggestion) return;
    getTopics(true)
      .then((t) => setAllTopics((t as Record<string, TopicMeta>) || {}))
      .catch(() => setAllTopics({}));
    setKeepKeys(new Set(suggestion.keep_keys));
    setSelectedNew(new Set(suggestion.new_topics.map((_, i) => i)));
  }, [open, suggestion]);

  const presetEntries = useMemo(
    () => Object.entries(allTopics).filter(([, v]) => v?.source === "preset"),
    [allTopics]
  );
  const willHide = presetEntries.filter(([k]) => !keepKeys.has(k));

  const toggleKeep = (key: string) => {
    setKeepKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleNew = (i: number) => {
    setSelectedNew((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!suggestion) return;
    setApplying(true);
    const newTopics = suggestion.new_topics
      .map((t, i) => (selectedNew.has(i) ? { name: t.name, icon: t.icon } : null))
      .filter(Boolean) as { name: string; icon: string }[];
    try {
      await applyTopicSuggestions({
        keep_keys: [...keepKeys],
        new_topics: newTopics,
      });
      toast.success("已根据简历更新训练领域");
      onApplied();
      onClose();
    } catch (e) {
      toast.error(`应用失败:${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setApplying(false);
    }
  };

  if (!open || !suggestion) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <Card
        className="w-[440px] max-w-[92vw] animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          <div className="text-lg font-semibold mb-1">根据简历推荐训练领域</div>
          <div className="text-xs text-dim mb-4">
            已分析你的简历,以下是建议保留/新增的领域。取消勾选会隐藏对应预置领域(可随时恢复)。
          </div>

          {suggestion.keep_keys.length > 0 && (
            <div className="mb-4">
              <div className="text-[13px] font-medium text-dim mb-2">
                保留的现有领域
              </div>
              <div className="space-y-1.5">
                {suggestion.keep_keys.map((key) => {
                  const meta = allTopics[key] || {};
                  const on = keepKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleKeep(key)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left cursor-pointer transition-all"
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border ${
                          on ? "bg-primary text-primary-foreground border-primary" : "bg-hover border-border"
                        }`}
                      >
                        {on && <Check size={12} />}
                      </span>
                      <span className="text-dim">{getTopicIcon(meta.icon, 16)}</span>
                      <span className="flex-1 truncate">{meta.name || key}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {suggestion.new_topics.length > 0 && (
            <div className="mb-4">
              <div className="text-[13px] font-medium text-dim mb-2">
                建议新增的领域
              </div>
              <div className="space-y-1.5">
                {suggestion.new_topics.map((t, i) => {
                  const on = selectedNew.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleNew(i)}
                      className="w-full flex items-start gap-2 px-3 py-2 rounded-lg border text-sm text-left cursor-pointer transition-all"
                    >
                      <span
                        className={`h-4 w-4 shrink-0 mt-0.5 rounded flex items-center justify-center border ${
                          on ? "bg-primary text-primary-foreground border-primary" : "bg-hover border-border"
                        }`}
                      >
                        {on && <Check size={12} />}
                      </span>
                      <span className="text-dim">{getTopicIcon(t.icon, 16)}</span>
                      <span className="flex-1 min-w-0">
                        <div className="truncate font-medium">{t.name}</div>
                        {t.reason && (
                          <div className="text-xs text-dim line-clamp-2">{t.reason}</div>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {willHide.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-hover/60 px-3 py-2.5 text-xs text-dim">
              <EyeOff size={14} className="mt-0.5 shrink-0" />
              <span>
                将隐藏 {willHide.length} 个不相关的预置领域:
                {willHide.map(([k, v]) => v.name || k).join("、")}
              </span>
            </div>
          )}

          <div className="flex gap-2.5 justify-end mt-5">
            <Button variant="outline" onClick={onClose} disabled={applying}>
              取消
            </Button>
            <Button variant="gradient" onClick={handleConfirm} disabled={applying}>
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "确认应用"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}