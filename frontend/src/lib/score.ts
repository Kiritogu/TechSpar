// 统一分数阈值配色(方向C·翠玉绿):高档翠玉绿 → 中高档青 → 中档琥珀(警告) → 低档红。
// 全站 History/Graph/Review/ResumeInterview/TopicDetail 共用,避免重复散落。
export type ScoreColor = { bg: string; color: string };

export function getScoreColor(score: number | null | undefined): ScoreColor | null {
  if (score == null) return null;
  if (score >= 8) return { bg: "rgba(22,163,74,0.15)", color: "var(--success)" };
  if (score >= 6) return { bg: "rgba(13,148,136,0.15)", color: "var(--teal)" };
  if (score >= 4) return { bg: "rgba(245,158,11,0.15)", color: "var(--warning)" };
  return { bg: "rgba(239,68,68,0.15)", color: "var(--destructive)" };
}