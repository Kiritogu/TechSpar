import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Play, Layers, Sparkles, Plus, Loader2 } from "lucide-react";
import TopicCard from "../components/TopicCard";
import TopicSuggestionModal from "../components/TopicSuggestionModal";
import { getTopics, startInterview, suggestTopics, getResumeStatus } from "../api/interview";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import useTaskStatus from "../hooks/useTaskStatus";

export default function TopicDrill() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [hasResume, setHasResume] = useState(null);
  const { creatingSessionMode, setCreatingSessionMode } = useTaskStatus();
  const loading = creatingSessionMode === "topic_drill";

  useEffect(() => {
    getTopics()
      .then(setTopics)
      .catch(() => setTopics({}))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    getResumeStatus()
      .then((s) => setHasResume(!!s?.has_resume))
      .catch(() => setHasResume(false));
  }, []);

  const handleStart = async () => {
    if (!selectedTopic) return;
    setCreatingSessionMode("topic_drill");
    try {
      const data = await startInterview("topic_drill", selectedTopic);
      navigate(`/interview/${data.session_id}`, { state: data });
    } catch (err) {
      alert("启动失败: " + err.message);
    } finally {
      setCreatingSessionMode(null);
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const s = await suggestTopics();
      setSuggestion(s);
    } catch (err) {
      alert("生成领域建议失败: " + err.message);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1024px] mx-auto px-4 py-8 md:px-8 md:py-10 animate-in fade-in duration-500 relative">
      
      {/* 右上角氛围光晕装饰 */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10 -mr-20 -mt-20 mix-blend-screen" />

      {/* 沉浸式 Hero 头区域 */}
      <div className="mb-14">
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm border border-primary/10">
            <Target size={24} className="text-primary" />
          </div>
          <div className="text-3xl md:text-[34px] font-display font-extrabold tracking-tight text-text">专项强化训练</div>
        </div>
        <div className="text-[15px] text-dim/90 max-w-[85%] leading-relaxed mt-2 font-medium">
          锁定高频技术盲区，进行高度浓缩的模块化实战。全天候模拟压迫感，AI 会根据应答水平动态下发深潜追问，直到触达个人的知识边界。
        </div>
      </div>

      {/* 选择面板标题 */}
      <div className="flex items-center gap-2 mb-6">
        <Layers size={20} className="text-primary" />
        <span className="text-[18px] font-bold text-text tracking-wide">部署您的演练战场</span>
      </div>

      {pageLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-28">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl border border-border/50 bg-card/60" />
          ))}
        </div>
      ) : Object.keys(topics).length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 backdrop-blur-sm px-6 py-14 md:py-16 text-center relative z-10 mb-28">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-5">
            <Target size={24} className="text-primary" />
          </div>
          <div className="text-lg font-bold text-text mb-2">还没有可训练的专项领域</div>
          <div className="text-[13px] text-dim/90 max-w-md mx-auto leading-relaxed mb-7">
            {hasResume ? (
              "已上传简历,可以让 AI 根据你的经历推荐最匹配的训练领域,也可以前往「题库」手动添加。"
            ) : (
              "先前往「题库」手动添加领域,添加后可以上传 Markdown 文件,或让 AI 生成核心知识与高频题。"
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasResume && (
              <Button
                variant="gradient"
                size="lg"
                className="rounded-2xl font-bold shadow-lg shadow-primary/20"
                onClick={handleSuggest}
                disabled={suggesting}
              >
                {suggesting ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Sparkles size={16} className="mr-2" />
                )}
                {suggesting ? "生成建议中..." : "根据简历推荐领域"}
              </Button>
            )}
            <Button
              variant={hasResume ? "outline" : "gradient"}
              size="lg"
              className="rounded-2xl font-bold"
              onClick={() => navigate("/knowledge")}
            >
              <Plus size={16} className="mr-2" />
              去题库添加领域
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-28 relative z-10">
          {Object.entries(topics).map(([key, info]) => (
            <TopicCard
              key={key}
              topicKey={key}
              name={info.name || key}
              icon={info.icon}
              selected={selectedTopic === key}
              onClick={() => setSelectedTopic(key)}
            />
          ))}
        </div>
      )}

      {/* 悬浮操作胶囊式体验 (Sticky Action Bar) */}
      <div className={cn(
        "fixed bottom-8 left-[max(1rem,calc(50%-450px))] right-[max(1rem,calc(50%-450px))] md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-50 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
        selectedTopic || loading ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none scale-95"
      )}>
        <div className="bg-card/95 backdrop-blur-xl p-3 md:pl-8 md:pr-3 rounded-3xl border border-border/80 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5),0_0_20px_rgba(var(--primary-rgb),0.1)] flex items-center justify-between gap-4">
          
          <div className="flex flex-col ml-3 md:ml-0 overflow-hidden">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-0.5">即将出战专项</span>
            <span className="text-[15px] font-extrabold text-text truncate">
              {selectedTopic ? topics[selectedTopic]?.name || selectedTopic : "尚未集结部队"}
            </span>
          </div>

          {loading ? (
             <div className="h-12 w-[160px] md:w-[180px] rounded-2xl bg-primary/10 flex items-center justify-center gap-2 relative overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-primary/20 animate-pulse pointer-events-none drop-shadow-sm" />
               <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-dot" />
               <div className="text-[13px] font-bold text-primary">构建对局中...</div>
             </div>
          ) : (
            <Button
              variant="gradient"
              size="lg"
              className="h-[52px] md:h-14 px-7 md:px-10 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.03] shrink-0 font-bold"
              onClick={handleStart}
            >
              启动降打击 <Play size={16} className="ml-2 fill-current" />
            </Button>
          )}
        </div>
      </div>
      {/* 空状态下的简历推荐弹窗 */}
      <TopicSuggestionModal
        open={!!suggestion}
        suggestion={suggestion}
        onClose={() => setSuggestion(null)}
        onApplied={() => {
          getTopics()
            .then(setTopics)
            .catch(() => setTopics({}));
        }}
      />
    </div>
  );
}
