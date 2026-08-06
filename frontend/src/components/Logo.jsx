import { cn } from "@/lib/utils";

// TechSpar 成长标:一条持续上扬的弧线,末端收束成一片嫩叶。
// 隐喻"越练越升、持续成长"——呼应产品"长期记忆驱动的进化闭环"。
// 单色翠玉绿,随主题 --primary 自适应,深浅通用。
export default function Logo({ className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TechSpar"
      shapeRendering="geometricPrecision"
      className={cn("shrink-0 block", className)}
    >
      {/* 上扬主弧(成长曲线) */}
      <path
        d="M6 38 C 14 38 18 25 27 19"
        stroke="var(--primary)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* 末端嫩叶(成长/生命力) */}
      <path
        d="M27 19 C 33 19 38 13 40 8 C 36 14 31 18 27 19 Z"
        fill="var(--primary)"
      />
    </svg>
  );
}