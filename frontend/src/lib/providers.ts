// 固定服务商下拉配置。选中服务商后 Base URL 自动确定，用户只需填模型名 + API Key。
// 与 backend/llm_provider.py 的 LLM_PROVIDERS 保持同源（Gemini 的 base_url 必须以 / 结尾）。

export interface ProviderOption {
  id: string;
  label: string;
  base_url: string;
  hint?: string;
}

// LLM 服务商（OpenAI 兼容端点 + Claude 原生 Anthropic API）
export const LLM_PROVIDERS: ProviderOption[] = [
  {
    id: "openai",
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    hint: "gpt-4o / gpt-4o-mini / o3-mini 等",
  },
  {
    id: "bailian",
    label: "阿里百炼",
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    hint: "qwen-max / qwen-plus / qwen-turbo 等",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    base_url: "https://api.deepseek.com/v1",
    hint: "deepseek-chat / deepseek-reasoner",
  },
  {
    id: "anthropic",
    label: "Claude",
    base_url: "https://api.anthropic.com",
    hint: "claude-sonnet-4-… / claude-3-7-sonnet-… 等",
  },
  {
    id: "gemini",
    label: "Gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai/",
    hint: "gemini-2.0-flash / gemini-2.5-pro 等",
  },
];

// Embedding 服务商（均为 OpenAI 兼容接口）
export const EMBEDDING_PROVIDERS: ProviderOption[] = [
  {
    id: "openai",
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    hint: "text-embedding-3-small / text-embedding-3-large",
  },
  {
    id: "bailian",
    label: "阿里百炼",
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    hint: "text-embedding-v3 / text-embedding-v2",
  },
  {
    id: "siliconflow",
    label: "SiliconFlow",
    base_url: "https://api.siliconflow.cn/v1",
    hint: "BAAI/bge-m3 / BAAI/bge-large-zh-v1.5",
  },
];

// DashScope 语音播报音色（qwen3-tts-flash）。与 backend/tts.py 的 VOICE_LABELS 同源。
export interface TTSVoiceOption {
  value: string;
  label: string;
}

export const TTS_VOICES: TTSVoiceOption[] = [
  { value: "Cherry", label: "Cherry · 女 · 阳光积极" },
  { value: "Serena", label: "Serena · 女 · 温柔" },
  { value: "Ethan", label: "Ethan · 男 · 标准普通话" },
  { value: "Chelsie", label: "Chelsie · 女 · 二次元" },
  { value: "Momo", label: "Momo · 女 · 撒娇搞怪" },
  { value: "Vivian", label: "Vivian · 女 · 活泼可爱" },
  { value: "Moon", label: "Moon · 男 · 率性帅气" },
  { value: "Maia", label: "Maia · 女 · 知性温柔" },
  { value: "Kai", label: "Kai · 男 · 磁性低沉" },
  { value: "Neil", label: "Neil · 男 · 新闻主播" },
  { value: "Elias", label: "Elias · 女 · 知识讲解" },
  { value: "Vincent", label: "Vincent · 男 · 沙哑烟嗓" },
  { value: "Jennifer", label: "Jennifer · 女 · 美语电影感" },
  { value: "Nini", label: "Nini · 女 · 软糯甜妹" },
  { value: "Bella", label: "Bella · 女 · 元气萝莉" },
];

/** 按存储的 base_url 反查服务商 id；未匹配（自定义 Base URL）返回列表首个。 */
export function matchProvider(
  baseUrl: string,
  list: ProviderOption[]
): ProviderOption {
  const norm = (s: string) => s.trim().replace(/\/+$/, "").toLowerCase();
  const target = norm(baseUrl);
  if (target) {
    const hit = list.find((p) => norm(p.base_url) === target);
    if (hit) return hit;
  }
  return list[0];
}
