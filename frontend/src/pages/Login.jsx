import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { ArrowLeft, Brain, Lock, Mail, Sparkles, Target, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "../components/Logo";

const BRAND_POINTS = [
  { icon: Brain, title: "记忆闭环", desc: "训练、实战、复盘共用一套画像" },
  { icon: Target, title: "专项训练", desc: "围绕薄弱点动态调题" },
  { icon: Sparkles, title: "实时陪练", desc: "面试官追问实时预测" },
];

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [allowReg, setAllowReg] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((d) => setAllowReg(d.allow_registration))
      .catch(() => setAllowReg(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isRegister && password.length < 6) {
      setError("密码至少 6 个字符");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "操作失败");
      }

      const data = await res.json();
      login(data.token, data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const title = isRegister ? "创建账号" : "欢迎回来";
  const desc = isRegister ? "注册后开始你的面试训练" : "登录继续你的面试训练";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      {/* 背景:垂直渐变 + 网格 + 三层翠玉光晕 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.05] via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(5,150,105,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(5,150,105,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.12),transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[360px] w-[480px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.1),transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-1/4 h-[300px] w-[360px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(5,150,105,0.08),transparent_60%)] blur-3xl" />

      <div className="relative z-10 w-full max-w-5xl">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-text cursor-pointer"
        >
          <ArrowLeft size={16} />
          返回首页
        </button>

        <div className="relative grid overflow-hidden rounded-panel border border-border/70 bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_8px_rgba(0,0,0,0.18),0_24px_60px_rgba(0,0,0,0.28)] lg:grid-cols-[1.05fr_1fr]">
          {/* 装饰:横跨面板的巨型同心环,增强纵深 */}
          <div className="pointer-events-none absolute -right-44 -top-56 h-[560px] w-[560px] rounded-full border border-primary/[0.08]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-28 -top-40 h-[560px] w-[560px] rounded-full border border-primary/[0.05]" aria-hidden="true" />
          {/* 左:品牌叙事 */}
          <div className="relative hidden flex-col gap-10 overflow-hidden border-r border-border/70 bg-gradient-to-br from-primary/[0.07] via-transparent to-teal/[0.05] p-10 lg:flex">
            {/* 角落径向光 + 巨型圆环,增强纵深 */}
            <div className="pointer-events-none absolute -top-20 -left-16 h-64 w-64 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.14),transparent_60%)] blur-2xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full border border-primary/[0.07]" aria-hidden="true" />

            <div className="relative flex items-center gap-2.5">
              <Logo className="h-9 w-9 rounded-lg drop-shadow-sm" />
              <span className="text-lg font-display font-bold">OfferSpar</span>
            </div>

            <div className="relative flex flex-1 flex-col justify-center gap-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">AI 技术面试陪练</div>

              <h1 className="text-2xl font-display font-bold leading-snug">
                从第一轮刷题开始，
                <br />
                到真实面试结束后的复盘，
                <br />
                系统都不会忘记你。
              </h1>

              <div className="h-px w-16 bg-gradient-to-r from-primary/60 to-transparent" aria-hidden="true" />

              <ul className="space-y-3.5">
                {BRAND_POINTS.map((p) => (
                  <li key={p.title} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <p.icon size={15} />
                    </span>
                    <span className="text-sm">
                      <span className="font-medium text-text">{p.title}</span>
                      <span className="text-dim"> · {p.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* 成长弧线 + 叶(后方衬线粗弧 + 主渐变,双层纵深) */}
              <div className="relative mt-2">
                <svg viewBox="0 0 640 300" fill="none" className="w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="login-arc" x1="0" y1="300" x2="640" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="var(--primary)" stopOpacity="0.85" />
                      <stop offset="1" stopColor="var(--teal)" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  <path d="M 44 276 C 164 276 292 206 484 134" stroke="var(--primary)" strokeOpacity="0.14" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="470" cy="120" r="90" stroke="var(--primary)" strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="4 8" />
                  <circle cx="470" cy="120" r="160" stroke="var(--primary)" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 8" />
                  <path d="M 20 260 C 150 260 280 190 470 120" stroke="url(#login-arc)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 470 120 C 510 120 550 78 580 28 C 548 92 510 120 470 120 Z" fill="url(#login-arc)" />
                  <circle cx="139" cy="243" r="8" fill="var(--primary)" />
                  <circle cx="267" cy="199" r="6" fill="var(--teal)" />
                  <circle cx="388" cy="151" r="5" fill="var(--primary)" opacity="0.85" />
                </svg>
              </div>
            </div>
          </div>

          {/* 右:表单 */}
          <div className="flex flex-col justify-center p-8 md:p-10">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <Logo className="h-10 w-10 rounded-xl drop-shadow-sm" />
              <div>
                <div className="text-lg font-display font-bold leading-none">{title}</div>
                <div className="mt-1 text-sm text-dim">{desc}</div>
              </div>
            </div>

            <h2 className="hidden text-xl font-display font-bold lg:block">{title}</h2>
            <p className="mt-1 hidden text-sm text-dim lg:block">{desc}</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isRegister && (
                <div className="space-y-1.5">
                  <Label>昵称</Label>
                  <div className="relative">
                    <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                    <Input type="text" autoComplete="name" placeholder="你的称呼（选填）" className="pl-9" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>邮箱</Label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                  <Input type="email" autoComplete="username" placeholder="your@email.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>密码</Label>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                  <Input type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "至少 6 个字符" : "输入密码"} className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red/10 border border-red/20 text-red text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" variant="gradient" className="w-full mt-2" disabled={loading}>
                {loading ? "处理中..." : isRegister ? "注册" : "登录"}
              </Button>
            </form>

            {allowReg && (
              <div className="mt-6 pt-5 border-t border-border text-center">
                <span className="text-sm text-dim">
                  {isRegister ? "已有账号？" : "还没有账号？"}
                </span>
                <button
                  onClick={() => { setIsRegister(!isRegister); setError(""); }}
                  className="text-sm text-primary font-medium ml-1.5 hover:underline cursor-pointer"
                >
                  {isRegister ? "去登录" : "注册"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
