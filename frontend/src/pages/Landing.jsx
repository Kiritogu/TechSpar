import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileText,
  Mic,
  Repeat,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "../components/Logo";

const LOOP_MODULES = [
  {
    key: "drill",
    step: "01",
    icon: BookOpen,
    title: "专项训练",
    headline: "集中补薄弱点",
    desc: "围绕单一主题持续训练，系统会根据历史表现动态调题，而不是重新随机出题。",
    reads: ["主题掌握度", "历史错因", "最近训练"],
    preview: [
      { label: "系统", tone: "text-primary", text: "发现你在 RAG 评估链路上连续失分。" },
      { label: "下一轮", tone: "text-teal", text: "追问 recall、precision 和离线评估设计。" },
      { label: "结果", tone: "text-orange", text: "把新弱点和掌握度变化写回画像。" },
    ],
    writeback: ["掌握度", "错因", "薄弱点"],
    chipClass: "bg-primary/10 text-primary",
    iconClass: "bg-primary/12 text-primary",
    borderClass: "border-primary/20",
    accentBorder: "border-primary/20",
    accentBg: "bg-primary/10",
    accentText: "text-primary",
    previewClass: "border-primary/15 bg-primary/[0.05]",
    nodeClass: "absolute z-20 left-[3%] top-[14%] w-[164px]",
    glowColor: "rgba(5,150,105,0.18)",
  },
  {
    key: "resume",
    step: "02",
    icon: FileText,
    title: "简历面试",
    headline: "围绕真实经历深挖",
    desc: "从自我介绍到项目深挖，系统会记录你的表达短板、技术深度缺口和叙事方式。",
    reads: ["简历内容", "历史表达问题", "项目上下文"],
    preview: [
      { label: "面试官", tone: "text-teal", text: "你在项目里具体负责了哪一段？" },
      { label: "风险", tone: "text-primary", text: "如果回答失焦，系统会标记项目表达不清。" },
      { label: "写回", tone: "text-orange", text: "沉淀技术深度缺口和沟通观察。" },
    ],
    writeback: ["项目表达", "技术深度", "沟通观察"],
    chipClass: "bg-teal/10 text-teal",
    iconClass: "bg-teal/12 text-teal",
    borderClass: "border-teal/20",
    accentBorder: "border-teal/20",
    accentBg: "bg-teal/10",
    accentText: "text-teal",
    previewClass: "border-teal/15 bg-teal/[0.05]",
    nodeClass: "absolute z-20 right-[3%] top-[14%] w-[164px]",
    glowColor: "rgba(13,148,136,0.18)",
  },
  {
    key: "job-prep",
    step: "03",
    icon: BriefcaseBusiness,
    title: "JD 备面",
    headline: "按岗位重新聚焦",
    desc: "输入 JD 后，系统会重新拆解岗位要求，结合简历与画像生成高概率追问和风险点。",
    reads: ["岗位 JD", "简历经历", "长期画像"],
    preview: [
      { label: "JD", tone: "text-orange", text: "重点在系统设计、性能优化和跨团队协作。" },
      { label: "系统", tone: "text-primary", text: "生成 HR 提问策略树和岗位高危路径。" },
      { label: "写回", tone: "text-teal", text: "记录优先补强项与岗位匹配风险。" },
    ],
    writeback: ["岗位风险", "优先补强项", "HR 策略树"],
    chipClass: "bg-orange/10 text-orange",
    iconClass: "bg-orange/12 text-orange",
    borderClass: "border-orange/20",
    accentBorder: "border-orange/20",
    accentBg: "bg-orange/10",
    accentText: "text-orange",
    previewClass: "border-orange/15 bg-orange/[0.05]",
    nodeClass: "absolute z-20 right-[3%] bottom-[8%] w-[164px]",
    glowColor: "rgba(251,146,60,0.18)",
  },
  {
    key: "recording",
    step: "04",
    icon: Mic,
    title: "录音复盘",
    headline: "把实战失误写回系统",
    desc: "真实面试后的录音、转写和逐题复盘会反哺画像，让下一轮训练更贴近真实失分点。",
    reads: ["真实录音", "转写文本", "历史表现"],
    preview: [
      { label: "录音", tone: "text-orange", text: "自动转写并拆成结构化 Q&A。" },
      { label: "系统", tone: "text-primary", text: "定位表达问题、内容缺口和失误模式。" },
      { label: "写回", tone: "text-teal", text: "把复盘结果反哺到下一轮训练和画像。" },
    ],
    writeback: ["失误模式", "表达问题", "改进建议"],
    chipClass: "bg-orange/10 text-orange",
    iconClass: "bg-orange/12 text-orange",
    borderClass: "border-orange/20",
    accentBorder: "border-orange/20",
    accentBg: "bg-orange/10",
    accentText: "text-orange",
    previewClass: "border-orange/15 bg-orange/[0.05]",
    nodeClass: "absolute z-20 left-[6%] bottom-[8%] w-[168px]",
    glowColor: "rgba(251,146,60,0.18)",
  },
];

const STORY_WORDS = [
  {
    key: "remember",
    word: "练完不忘",
    desc: "每一轮的得分、弱点和表达习惯，都会写回同一套长期记忆，不会随会话结束蒸发。",
    gradient: "bg-[radial-gradient(ellipse_at_50%_18%,rgba(5,150,105,0.26),transparent_58%),radial-gradient(ellipse_at_86%_74%,rgba(13,148,136,0.16),transparent_52%)]",
    memory: {
      title: "写回长期记忆",
      rows: ["错因 3 条已归档", "主题掌握度 72 → 78", "表达短板 +1"],
    },
  },
  {
    key: "adapt",
    word: "越练越懂",
    desc: "下一轮开始前，系统先读画像再决定问什么、提醒什么——是延续训练，不是重新开始。",
    gradient: "bg-[radial-gradient(ellipse_at_50%_18%,rgba(13,148,136,0.24),transparent_58%),radial-gradient(ellipse_at_14%_80%,rgba(5,150,105,0.16),transparent_52%)]",
    memory: {
      title: "下一轮输入",
      rows: ["从画像决定问什么", "优先补薄弱点", "沿用历史错因"],
    },
  },
];

const MOMENTS = [
  {
    num: "01",
    ui: "weakness",
    title: "弱点不再漏网",
    desc: "每一轮都从历史错因出发，追着薄弱点出题，而不是重新随机刷一遍。",
    tilt: "-rotate-2",
    chip: "bg-primary text-primary-foreground",
  },
  {
    num: "02",
    ui: "resume",
    title: "项目终于讲清了",
    desc: "围绕真实经历深挖，表达短板和技术深度缺口一个个暴露、一个个补掉。",
    tilt: "rotate-1",
    chip: "bg-primary text-primary-foreground",
  },
  {
    num: "03",
    ui: "jd",
    title: "备面像做作战地图",
    desc: "输入 JD，系统拆出岗位要求、高概率追问和风险点，不再凭感觉准备。",
    tilt: "rotate-2",
    chip: "bg-primary text-primary-foreground",
  },
  {
    num: "04",
    ui: "review",
    title: "失误写回系统",
    desc: "录音自动转写、逐题复盘，失分点回流画像，下一轮训练更贴近真实。",
    tilt: "rotate-1",
    chip: "bg-primary text-primary-foreground",
  },
  {
    num: "05",
    ui: "offer",
    title: "一切都值得",
    desc: "从第一轮刷题到真实 Offer，系统记得你走过的每一步。",
    tilt: "-rotate-2",
    chip: "bg-primary text-primary-foreground",
  },
];

const MEMORY_LAYERS = [
  {
    icon: FileText,
    title: "Session Context",
    subtitle: "当前场景",
    desc: "简历、JD、最近训练记录和本轮对话上下文，决定系统这次如何理解你的面试场景。",
  },
  {
    icon: BarChart3,
    title: "Topic Mastery",
    subtitle: "主题掌握度",
    desc: "每个领域都持续记录掌握度、遗漏点、练习轨迹和复习优先级，避免下一轮又从零开始。",
  },
  {
    icon: Brain,
    title: "Global Profile",
    subtitle: "长期画像",
    desc: "跨场景沉淀你的强项、弱项、项目表达习惯、思维模式和常见高危路径。",
  },
];

const revealStyle = (delay) => ({ "--reveal-delay": `${delay}s` });

/* ── Typing effect for detail panel preview lines ── */
function TypedLine({ text, delay = 0 }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) { setDisplayed(""); return; }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 22);
    return () => clearInterval(interval);
  }, [text, started]);

  return (
    <span className="text-dim">
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[14px] bg-primary/60 align-middle ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  // 落地页锁深色(视觉世界观基于翠玉绿深松针底);离开时恢复用户在应用内的主题偏好
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.toggle(
        "dark",
        (localStorage.getItem("theme") || "dark") === "dark"
      );
    };
  }, []);

  const loopRef = useScrollReveal();
  const momentsRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  const scrollToLoop = () => {
    document.getElementById("loop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="landing-motion min-h-screen bg-bg text-text">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(5,150,105,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60 pointer-events-none" />
      <div className="grain-overlay" aria-hidden="true" />

      <header className="sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 rounded-lg drop-shadow-sm" />
            <div>
              <div className="text-lg font-display font-bold leading-none">OfferSpar</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-dim">From Practice To Real Interview</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/login")}>
              登录
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative -mt-[72px] flex min-h-screen flex-col overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-bg">
            {/* 纯代码视觉:翠玉光晕 + 成长弧线品牌 SVG + 漂浮产品 mini 卡,零照片零视频 */}
            <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.14),transparent_60%)] blur-3xl" />
            <div className="absolute -right-24 top-1/3 h-[420px] w-[560px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.12),transparent_60%)] blur-3xl" />

            <svg
              viewBox="0 0 1200 760"
              className="absolute inset-0 h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="hero-arc" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(5,150,105,0.5)" />
                  <stop offset="100%" stopColor="rgba(52,211,153,0.9)" />
                </linearGradient>
              </defs>
              <path d="M 40 660 C 240 660 460 480 700 330" stroke="url(#hero-arc)" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
              <path d="M 700 330 C 790 330 880 230 940 140 C 860 250 770 330 700 330 Z" fill="rgba(52,211,153,0.4)" />
              <circle cx="180" cy="645" r="5" fill="rgba(5,150,105,0.5)" />
              <circle cx="360" cy="565" r="7" fill="rgba(13,148,136,0.5)" />
              <circle cx="560" cy="425" r="5" fill="rgba(52,211,153,0.5)" />
              <circle cx="820" cy="250" r="130" stroke="rgba(52,211,153,0.14)" strokeWidth="1.5" strokeDasharray="6 12" />
              <circle cx="820" cy="250" r="200" stroke="rgba(52,211,153,0.09)" strokeWidth="1.5" strokeDasharray="6 12" />
            </svg>

            {/* 漂浮的产品 mini 卡,与下方文案呼应 */}
            <div className="absolute right-[12%] top-[24%] z-10 hidden animate-float-soft md:block" style={{ animationDelay: "0.6s" }}>
              <div className="rounded-item border border-primary/20 bg-card/90 px-4 py-2.5 shadow-[0_18px_40px_-18px_rgba(5,150,105,0.4)] backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.2em] text-dim">主题掌握度</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tabular-nums text-primary">82</span>
                  <span className="text-xs text-dim">/100</span>
                </div>
              </div>
            </div>

            <div className="absolute left-[9%] top-[42%] z-10 hidden w-[210px] animate-float md:block" style={{ animationDelay: "1.4s" }}>
              <div className="rounded-panel border border-teal/25 bg-card/90 p-3.5 shadow-[0_18px_40px_-18px_rgba(13,148,136,0.4)] backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.2em] text-teal">下一轮追问</div>
                <div className="mt-1 text-xs leading-5 text-dim">先给容量判断，再补监控指标和回滚方案。</div>
              </div>
            </div>

            <div className="absolute bottom-[34%] right-[24%] z-10 hidden animate-float-soft lg:flex" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card/90 px-3 py-1.5 text-xs text-primary shadow-sm backdrop-blur-sm">
                <Repeat size={12} /> 弱点已写回长期记忆
              </div>
            </div>

            {/* 底部渐入保证文案可读 */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/30" />
          </div>

          <div className="relative z-10 mx-auto flex max-w-4xl flex-1 flex-col items-center justify-end px-6 pt-[72px] pb-12 text-center">
            <h1 className="text-4xl font-display font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl md:leading-[1.15] animate-fade-in-up">
              把技术面试做成
              <span className="hero-gradient-text mt-3 block bg-gradient-to-r from-accent-light via-primary to-teal bg-clip-text text-transparent">
                一条持续进化的闭环
              </span>
            </h1>

            <p className="mt-9 max-w-xl text-base leading-8 tracking-[0.04em] text-dim md:text-lg animate-fade-in-up [animation-delay:0.1s]">
              训练、实战和复盘共用一套长期记忆，<span className="font-medium text-text">越练越懂你</span>。
            </p>

            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row animate-fade-in-up [animation-delay:0.2s]">
              <Button variant="gradient" size="lg" onClick={() => navigate("/login")}>
                开始备战
                <ArrowRight size={16} />
              </Button>
              <button
                type="button"
                onClick={scrollToLoop}
                className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-dim transition-colors hover:text-text"
              >
                看闭环怎么运转
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex justify-center pb-10 animate-fade-in [animation-delay:0.5s]">
            <div className="flex flex-col items-center gap-1 text-xs tracking-[0.3em] text-dim">
              滑动继续
              <ChevronDown size={16} className="animate-bounce" />
            </div>
          </div>
        </section>

        <StoryScreens />

        <section id="loop" ref={loopRef} className="scroll-reveal px-6 pb-16 pt-4 md:px-10 md:pb-24">
          <div className="mx-auto max-w-7xl">
            <div className="reveal-item" style={revealStyle(0.04)}>
              <SectionHeading
                label="面试闭环"
                title="这套闭环怎么运转"
                desc="四个模块不是四个孤岛：每个模块的输入与输出都会写回同一套长期记忆，驱动下一轮训练、辅助和复盘。"
              />
            </div>

            <div className="reveal-item mt-10" style={revealStyle(0.12)}>
              <LoopVisual />
            </div>

            <div
              className="reveal-item mt-12 grid gap-6 border-t border-border/60 pt-8 md:grid-cols-3"
              style={revealStyle(0.2)}
            >
              {MEMORY_LAYERS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        {item.title}
                        <span className="ml-2 text-xs font-normal text-dim">{item.subtitle}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-6 text-dim">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={momentsRef} className="scroll-reveal px-6 pb-20 md:px-10 md:pb-28">
          <div className="mx-auto max-w-7xl">
            <div className="reveal-item" style={revealStyle(0.04)}>
              <SectionHeading
                label="真实时刻"
                title="那些真正帮上忙的时刻。"
                desc="不是功能清单，而是 OfferSpar 进入备面日常之后，一次次接住麻烦、记得你、把事情往前推的瞬间。"
              />
            </div>

            <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
              {MOMENTS.map((item, index) => (
                <div
                  key={item.num}
                  className={cn(
                    "reveal-item rounded-item border border-border/70 bg-card p-3 pb-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:rotate-0 hover:-translate-y-1",
                    item.tilt
                  )}
                  style={revealStyle(0.06 + index * 0.06)}
                >
                  <div className="overflow-hidden rounded-item border border-border/60 bg-background/60">
                    <div className="aspect-[4/3]">
                      <MomentUI variant={item.ui} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 px-1">
                    <span
                      className={cn(
                        "flex h-7 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-wider",
                        item.chip
                      )}
                    >
                      {item.num}
                    </span>
                    <span className="text-lg font-display font-bold text-text">{item.title}</span>
                  </div>
                  <p className="mt-2 px-1 text-sm leading-6 text-dim">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          ref={ctaRef}
          className="scroll-reveal relative flex min-h-screen items-center justify-center overflow-hidden px-6 md:px-10"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="story-glow absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />
            <svg
              className="absolute bottom-0 right-0 hidden h-[82%] w-auto opacity-90 lg:block [mask-image:radial-gradient(ellipse_62%_78%_at_55%_48%,black_52%,transparent_98%)]"
              viewBox="0 0 760 640"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="cta-arc" x1="0" y1="620" x2="620" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="var(--primary)" stopOpacity="0.75" />
                  <stop offset="1" stopColor="var(--teal)" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <circle cx="520" cy="260" r="120" stroke="var(--primary)" strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="4 8" />
              <circle cx="520" cy="260" r="220" stroke="var(--primary)" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 8" />
              <path d="M 40 560 C 220 560 360 420 520 260" stroke="url(#cta-arc)" strokeWidth="3" strokeLinecap="round" />
              <path d="M 520 260 C 566 260 618 200 648 120 C 616 206 566 260 520 260 Z" fill="url(#cta-arc)" />
              <circle cx="168" cy="536" r="9" fill="var(--primary)" />
              <circle cx="288" cy="470" r="7" fill="var(--teal)" />
              <circle cx="453" cy="433" r="6" fill="var(--primary)" opacity="0.85" />
            </svg>
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="reveal-item text-sm font-medium text-primary" style={revealStyle(0.04)}>
              准备、模拟、实战、复盘，全部接进同一条闭环
            </div>
            <h2
              className="reveal-item mt-5 text-4xl font-display font-bold tracking-tight md:text-6xl md:leading-[1.15]"
              style={revealStyle(0.1)}
            >
              从第一轮刷题开始，到真实面试结束后复盘，系统都不会忘记你
            </h2>
            <p
              className="reveal-item mx-auto mt-6 max-w-xl text-base leading-8 text-dim md:text-lg"
              style={revealStyle(0.16)}
            >
              这不是另一个只会生成题目的 AI 工具，而是一套从刷题到实战的技术面试陪练系统。
            </p>
            <div className="reveal-item mt-10 flex justify-center" style={revealStyle(0.22)}>
              <Button
                variant="gradient"
                size="lg"
                className="shadow-[0_16px_40px_-18px_rgba(5,150,105,0.5)] transition-shadow hover:shadow-[0_20px_48px_-16px_rgba(5,150,105,0.55)]"
                onClick={() => navigate("/login")}
              >
                进入应用
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="font-display font-bold">OfferSpar</span>
          </div>
          <p className="text-xs text-dim">从刷题到实战的 AI 技术面试陪练系统</p>
          <div className="flex gap-6 text-xs">
            <a
              href="https://yongbo.xyz/"
              target="_blank"
              rel="noreferrer"
              className="text-dim transition-colors hover:text-text"
            >
              访问应用
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── 叙事屏抽象几何背景:随屏切换的同心环 + 上升弧线 ── */
function GrowthShape({ variant }) {
  const variants = [
    { dx: -40, dy: -60, a: "rgba(52,211,153,0.12)", b: "rgba(13,148,136,0.10)" },
    { dx: 50, dy: -30, a: "rgba(13,148,136,0.14)", b: "rgba(52,211,153,0.10)" },
    { dx: -20, dy: 40, a: "rgba(52,211,153,0.12)", b: "rgba(20,184,166,0.10)" },
  ];
  const p = variants[variant % variants.length];
  return (
    <svg viewBox="0 0 900 900" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      <circle cx={450 + p.dx} cy={450 + p.dy} r="340" stroke={p.a} strokeWidth="1.5" strokeDasharray="8 14" />
      <circle cx={450 + p.dx * 1.6} cy={450 + p.dy * 1.6} r="260" stroke={p.b} strokeWidth="1.5" strokeDasharray="6 12" />
      <circle cx={450 + p.dx * 0.5} cy={450 + p.dy * 0.5} r="430" stroke={p.a} strokeWidth="1" opacity="0.6" />
      <path d="M 120 720 C 320 720 480 540 680 380" stroke="rgba(52,211,153,0.22)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="680" cy="380" r="8" fill="rgba(52,211,153,0.28)" />
    </svg>
  );
}

/* ── 叙事屏「记忆写回」迷你面板:代码绘,替代原照片副卡 ── */
function MemoryWritebackCard({ item }) {
  return (
    <div className="rounded-panel border border-primary/15 bg-card/80 px-5 py-4 text-left shadow-[0_20px_50px_-20px_rgba(5,150,105,0.35)] backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Repeat size={12} /> {item.memory.title}
      </div>
      <div className="mt-3 space-y-2">
        {item.memory.rows.map((row) => (
          <div key={row} className="flex items-center gap-2 text-[13px] leading-5 text-text/85">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 真实时刻卡内的代码绘产品 mini UI,替代原照片 ── */
function MomentUI({ variant }) {
  const row = (label, pct, tone) => (
    <div className="flex items-center gap-2 text-[11px] leading-5">
      <span className="w-24 shrink-0 truncate text-dim">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right tabular-nums text-text/70">{pct}</span>
    </div>
  );

  switch (variant) {
    case "weakness":
      return (
        <div className="flex h-full flex-col justify-center gap-2.5 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">弱点扫描</div>
          {row("RAG 评估链路", 78, "bg-primary")}
          {row("SQL 优化", 62, "bg-teal")}
          {row("Redis 降级", 41, "bg-orange")}
        </div>
      );
    case "resume":
      return (
        <div className="flex h-full flex-col justify-center gap-2 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">项目深挖</div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-[11px] leading-5">
            <span className="font-semibold text-teal">面试官:</span> 你在项目里具体负责了哪一段？
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-[11px] leading-5">
            <span className="font-semibold text-text/85">你:</span> 我主要负责 RAG 链路的评估部分…
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-orange">
            <CircleAlert size={12} /> 表达失焦，系统建议聚焦「项目深挖」
          </div>
        </div>
      );
    case "jd":
      return (
        <div className="flex h-full flex-col justify-center gap-2.5 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">JD 拆解</div>
          <div className="flex flex-wrap gap-1.5">
            {["系统设计", "性能优化", "跨团队"].map((t) => (
              <span key={t} className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {t}
              </span>
            ))}
          </div>
          <div className="space-y-1.5 text-[11px] leading-5 text-dim">
            <div className="flex items-center gap-1.5"><Target size={12} className="text-teal" /> 高概率追问已生成 3 条</div>
            <div className="flex items-center gap-1.5"><ShieldAlert size={12} className="text-orange" /> 2 个高危风险区域</div>
          </div>
        </div>
      );
    case "review":
      return (
        <div className="flex h-full flex-col justify-center gap-2.5 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">复盘四维</div>
          {row("表达沟通", 82, "bg-primary")}
          {row("技术深度", 64, "bg-teal")}
          {row("问题解决", 70, "bg-teal")}
          <div className="flex items-center gap-1.5 text-[10px] text-dim"><TrendingUp size={12} className="text-green" /> 3 条失误已写回画像</div>
        </div>
      );
    case "offer":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-5 py-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/15 text-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="text-[11px] font-semibold text-text/85">从第一轮刷题到真实 Offer</div>
          <div className="flex items-center gap-3 text-[11px] text-dim">
            <span>训练 <span className="font-bold tabular-nums text-text/80">42</span> 次</span>
            <span>·</span>
            <span>平均 <span className="font-bold tabular-nums text-text/80">86</span> 分</span>
          </div>
          <div className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">Offer 达成 ✓</div>
        </div>
      );
    default:
      return null;
  }
}

/* ── 叙事大字屏:sticky 三屏,滚动驱动词组逐字浮现 ── */
function StoryScreens() {
  const containerRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        const progress = Math.min(Math.max(-el.getBoundingClientRect().top / total, 0), 0.999);
        setActive(Math.floor(progress * STORY_WORDS.length));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: `${STORY_WORDS.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {STORY_WORDS.map((item, index) => (
          <div
            key={item.key}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              item.gradient,
              index === active ? "opacity-100" : "opacity-0"
            )}
          >
            <GrowthShape variant={index} />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-bg/60 via-transparent to-bg/80" />

        <div className="relative w-full px-6 text-center">
          <div className="text-sm font-medium text-primary">为什么 OfferSpar 不只是一个题库？</div>

          <div className="relative mx-auto mt-6 h-56 w-full max-w-3xl md:h-64">
            {STORY_WORDS.map((item, index) => (
              <div
                key={item.key}
                className={cn("story-word absolute inset-x-0 top-6", index === active && "active")}
                aria-hidden={index !== active}
              >
                <div className="font-display text-6xl font-bold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.7)] md:text-8xl">
                  {item.word.split("").map((char, charIndex) => (
                    <span
                      key={charIndex}
                      className="story-char"
                      style={{ "--char-delay": index === active ? `${charIndex * 90}ms` : "0ms" }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
                <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/80 drop-shadow-[0_1px_10px_rgba(0,0,0,0.8)] md:text-lg">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2">
            {STORY_WORDS.map((item, index) => (
              <span
                key={item.key}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index === active ? "w-8 bg-primary" : "w-3 bg-border"
                )}
              />
            ))}
          </div>

          <div className="mx-auto mt-8 w-full max-w-sm">
            <MemoryWritebackCard item={STORY_WORDS[active]} />
          </div>
        </div>
      </div>
    </section>
  );
}

function LoopVisual() {
  const [activeKey, setActiveKey] = useState("recording");
  const activeModule = LOOP_MODULES.find((item) => item.key === activeKey) || LOOP_MODULES[0];

  return (
    <div className="relative">
      <div className="grid gap-4 md:hidden">
        <DetailPanel module={activeModule} compact />

        <div className="grid grid-cols-2 gap-2">
          {LOOP_MODULES.map((item) => (
            <LoopNode
              key={item.key}
              item={item}
              active={item.key === activeKey}
              onSelect={setActiveKey}
              mobile
            />
          ))}
        </div>

        <CenterMemoryCard activeModule={activeModule} mobile />

        <div className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-dim">
          训练 → 评估 → 画像更新 → 下一轮更精准
        </div>
      </div>

      <div className="relative hidden h-[760px] md:block">
        <div className="absolute inset-0 rounded-[36px] border border-border/80 bg-card/82 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-sm" />
        <div className="absolute inset-y-8 left-8 right-[36%] rounded-[32px] border border-primary/10 bg-gradient-to-br from-primary/[0.035] via-transparent to-teal/[0.045]" />

        <div className="absolute inset-y-8 left-8 right-[36%]">
          <svg
            viewBox="0 0 440 620"
            className="absolute inset-0 h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="loop-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L8 4 L0 8 Z" fill="rgba(5,150,105,0.42)" />
              </marker>
            </defs>
            <circle cx="220" cy="310" r="176" stroke="rgba(5,150,105,0.14)" strokeWidth="1.5" strokeDasharray="10 16" />
            <circle cx="220" cy="310" r="138" stroke="rgba(20,184,166,0.08)" strokeWidth="1.2" />
            <path
              d="M96 186 A176 176 0 0 1 344 186"
              stroke="rgba(5,150,105,0.32)"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#loop-arrow)"
              className="loop-beam"
              style={{ "--beam-delay": "0s" }}
            />
            <path
              d="M344 186 A176 176 0 0 1 344 434"
              stroke="rgba(13,148,136,0.3)"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#loop-arrow)"
              className="loop-beam"
              style={{ "--beam-delay": "0.9s" }}
            />
            <path
              d="M344 434 A176 176 0 0 1 96 434"
              stroke="rgba(251,146,60,0.28)"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#loop-arrow)"
              className="loop-beam"
              style={{ "--beam-delay": "1.8s" }}
            />
            <path
              d="M96 434 A176 176 0 0 1 96 186"
              stroke="rgba(5,150,105,0.32)"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#loop-arrow)"
              className="loop-beam"
              style={{ "--beam-delay": "2.7s" }}
            />
            <path d="M220 310 L96 186" stroke="rgba(5,150,105,0.08)" strokeWidth="1.5" />
            <path d="M220 310 L344 186" stroke="rgba(13,148,136,0.08)" strokeWidth="1.5" />
            <path d="M220 310 L344 434" stroke="rgba(251,146,60,0.08)" strokeWidth="1.5" />
            <path d="M220 310 L96 434" stroke="rgba(251,146,60,0.08)" strokeWidth="1.5" />
          </svg>

          {LOOP_MODULES.map((item) => (
            <LoopNode
              key={item.key}
              item={item}
              active={item.key === activeKey}
              onSelect={setActiveKey}
              className={item.nodeClass}
            />
          ))}

          <div className="loop-shell absolute z-10 left-1/2 top-1/2 w-[220px] -translate-x-1/2 -translate-y-1/2">
            <CenterMemoryCard activeModule={activeModule} />
          </div>
        </div>

        <div className="absolute bottom-14 left-8 right-[36%] flex justify-center">
          <div className="rounded-full border border-primary/15 bg-bg/88 px-4 py-3 text-center text-sm text-dim shadow-sm backdrop-blur-sm">
            训练 → 评估 → 画像更新 → 下一轮更精准
          </div>
        </div>

        <div className="absolute right-8 top-8 bottom-8 w-[32%]">
          <div key={activeModule.key} className="detail-panel-enter h-full">
            <DetailPanel module={activeModule} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoopNode({ item, active, onSelect, className, mobile = false }) {
  const Icon = item.icon;
  const motionDelay = `${(Number(item.step) - 1) * 0.35}s`;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      onFocus={() => onSelect(item.key)}
      onMouseEnter={mobile ? undefined : () => onSelect(item.key)}
      className={cn(
        mobile
          ? "rounded-[20px] border bg-card/96 p-3 text-left shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
          : "absolute rounded-[22px] border bg-card/96 p-4 text-left shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1",
        item.borderClass,
        active
          ? cn("scale-[1.02] opacity-100 shadow-[0_28px_90px_rgba(15,23,42,0.12)]", item.accentBorder)
          : "opacity-88 hover:opacity-100",
        className
      )}
    >
      <div className={cn(!mobile && "loop-node-body")} style={!mobile ? { "--float-delay": motionDelay } : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", item.iconClass)}>
            <Icon size={18} />
          </div>
          <div className="flex items-center gap-2">
            {active && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", item.accentBg, item.accentText)}>
                当前
              </span>
            )}
            <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-dim">
              {item.step}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className={cn("text-base font-semibold", active && item.accentText)}>{item.title}</div>
          <div className="mt-1 text-sm text-dim">{item.headline}</div>
        </div>
      </div>
    </button>
  );
}

function DetailPanel({ module, compact = false }) {
  const Icon = module.icon;

  return (
    <Card
      className={cn(
        "h-full rounded-[30px] border-border/80 bg-card/96 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur-sm",
        module.highlight && "shadow-[0_32px_100px_rgba(20,184,166,0.14)]"
      )}
    >
      <CardContent className={cn("p-5 md:p-6", compact && "p-5")}>
        <div className="flex items-center justify-between gap-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              module.accentBorder,
              module.accentBg,
              module.accentText
            )}
          >
            {module.step} / {String(LOOP_MODULES.length).padStart(2, "0")}
            <span className="text-dim">当前聚焦模块</span>
          </div>
          <div className="text-xs text-dim">点击环上节点查看不同阶段</div>
        </div>

        <div className="mt-5 flex items-start gap-4">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", module.iconClass)}>
            <Icon size={20} />
          </div>
          <div>
            <div className="text-2xl font-display font-bold tracking-tight">{module.title}</div>
            <div className="mt-1 text-sm text-dim">{module.headline}</div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-dim">{module.desc}</p>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-dim">系统会读取</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {module.reads.map((tag) => (
              <span key={tag} className="rounded-full border border-border/70 bg-bg/80 px-2.5 py-1 text-xs text-dim">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className={cn("mt-5 rounded-[24px] border p-4", module.previewClass)}>
          <div className="text-[11px] uppercase tracking-[0.22em] text-dim">运行示意</div>
          <div className="mt-3 space-y-2.5 text-sm leading-7">
            {module.preview.map((line) => (
              <div key={line.label}>
                <span className={cn("font-medium", line.tone)}>{line.label}</span>
                <span className="text-dim"> &gt; </span>
                <TypedLine text={line.text} delay={module.preview.indexOf(line) * 600} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-dim">写回长期记忆</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {module.writeback.map((tag) => (
              <span key={tag} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", module.chipClass)}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CenterMemoryCard({ activeModule, mobile = false }) {
  const ActiveIcon = activeModule.icon;

  return (
    <Card
      className={cn(
        "rounded-[28px] border-primary/18 bg-card/96 shadow-[0_26px_60px_-24px_rgba(5,150,105,0.4)] backdrop-blur-sm",
        !mobile && "animate-glow-pulse"
      )}
    >
      <CardContent className={cn("p-4", !mobile && "p-4")}>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          <Repeat size={11} />
          长期记忆引擎
        </div>

        <h3 className={cn("mt-3 font-display font-bold tracking-tight leading-tight", mobile ? "text-xl" : "text-base")}>
          统一保存你的面试轨迹
        </h3>

        <div className="mt-3 grid gap-1.5">
          {["Session Context", "Topic Mastery", "Global Profile"].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border/80 bg-bg/85 px-3 py-1.5 text-xs text-dim shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-border/80 bg-bg/85 p-2.5 shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-dim">当前正在驱动</div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", activeModule.iconClass)}>
              <ActiveIcon size={13} />
            </div>
            <div>
              <div className={cn("text-xs font-semibold", activeModule.accentText)}>{activeModule.title}</div>
              <div className="text-[11px] text-dim">{activeModule.headline}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ label, title, desc }) {
  return (
    <div className="max-w-4xl">
      <div className="text-sm font-medium text-primary">{label}</div>
      <h2 className="mt-3 text-2xl font-display font-bold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-dim md:text-base">{desc}</p>
    </div>
  );
}
