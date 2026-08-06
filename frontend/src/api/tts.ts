// DashScope 语音合成客户端：POST /api/tts 返回 wav
// 音色在设置页配置（服务端按用户读取），这里无需传。
import { authFetch } from "./client";

/** 合成一句话，返回 audio/wav Blob。失败抛错，调用方 catch 静默跳过。 */
export async function synthesizeAudio(text: string): Promise<Blob> {
  const res = await authFetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    let detail = `TTS ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.blob();
}
