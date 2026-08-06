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
