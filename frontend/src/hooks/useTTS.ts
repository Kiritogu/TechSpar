// 面试官语音播报:文字流攒成大块 → 逐块合成 wav → 串行播放,并边播边预取下一块。
// 断句停顿优化:
//  1) 只用强边界(。！？!?)切块,攒够 MIN_CHUNK 才合成,避免 `；\n` 把回复切成碎片;
//  2) 后台合成循环预先填好队列里各块的音频,播放期间下一块已就绪,块间不再有网络间隙。
import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeAudio } from "../api/tts";

const STORAGE_KEY = "tts_enabled";
// 强断句边界(中文句号/叹号/问号 + 英文标点)。`；;`、换行不再作为切块边界,
// 否则短碎片会各自触发一次合成,产生"咯噔咯噔"的断句停顿。
const STRONG = new Set(["。", "！", "？", "!", "?"]);
const MIN_CHUNK = 10; // 攒够这些字符才切块;短句(如"好的。")会并入下一句,减少碎片
const MAX_CHUNK = 70; // 超长强制切块,避免首音频等太久

/** 从累积缓冲取一块文本:优先在最后一个强边界切;长度不足或边界未到就继续攒。 */
function popChunk(buf: string): { emitted: string; rest: string } {
  if (!buf) return { emitted: "", rest: "" };
  let lastBoundary = -1;
  for (let i = 0; i < buf.length; i++) {
    if (STRONG.has(buf[i])) lastBoundary = i + 1;
  }
  if (lastBoundary > 0 && buf.length >= MIN_CHUNK) {
    return { emitted: buf.slice(0, lastBoundary), rest: buf.slice(lastBoundary) };
  }
  if (buf.length >= MAX_CHUNK) {
    if (lastBoundary > 0) {
      return { emitted: buf.slice(0, lastBoundary), rest: buf.slice(lastBoundary) };
    }
    return { emitted: buf, rest: "" }; // 无边界也强制切,避免无限攒
  }
  return { emitted: "", rest: buf };
}

/** 把整段文本切成播报块(手动重听/整段播报用)。 */
function chunkify(text: string): string[] {
  const out: string[] = [];
  let buf = text;
  while (buf) {
    const { emitted, rest } = popChunk(buf);
    if (!emitted) {
      const s = buf.trim();
      if (s) out.push(s);
      break;
    }
    out.push(emitted);
    buf = rest;
  }
  return out;
}

export interface UseTTS {
  enabled: boolean;
  speaking: boolean;
  toggle: () => void;
  /** 停止当前播报并静音本轮后续流(下一轮 startStream 后恢复)。 */
  stop: () => void;
  /** 新一轮 assistant 回复开始前调用:清空上一轮句缓冲/队列。 */
  startStream: () => void;
  /** 文字流的每个 token 喂进来。 */
  feedToken: (token: string) => void;
  /** 回复结束,冲刷剩余半句。 */
  flush: () => void;
  /** 手动整段重听(会打断当前播报)。 */
  speakNow: (text: string) => void;
}

/**
 * @param available 后端 TTS 是否可用（配置了 DashScope key）。true → 自动开启播报；
 *   false → 强制关闭；undefined/null → 未知（按 localStorage 既有偏好）。
 *   挂载后 available 变化会同步 enabled（可用则自动开，不可用则关）。
 */
export default function useTTS(available?: boolean): UseTTS {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (available === false) return false;
    try {
      return localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [speaking, setSpeaking] = useState(false);

  // 后端可用性变化 → 自动播报开关跟随（设置页配置 key/音色后返回即生效）
  const prevAvailable = useRef(available);
  useEffect(() => {
    if (available === prevAvailable.current) return;
    prevAvailable.current = available;
    if (available === true) {
      setEnabled(true); // TTS 可用 → 自动播报，无需手动点击
    } else if (available === false) {
      setEnabled(false);
    }
  }, [available]);

  const enabledRef = useRef(enabled);
  const bufRef = useRef("");
  // 待播报块:{text, blob|null}。blob 由后台合成循环填充,播放只取已就绪的 blob。
  const queueRef = useRef<{ text: string; blob: Blob | null }[]>([]);
  const synthBusyRef = useRef(false); // 合成循环是否在跑(同时只合成一个)
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0); // 自增令牌,使过期的异步合成/播放作废
  const skipRef = useRef(false); // 本轮回合静音

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // 切换开关:持久化 + 关闭时静音
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!enabled) {
      tokenRef.current += 1;
      audioRef.current?.pause();
      audioRef.current?.removeAttribute("src");
      audioRef.current = null;
      queueRef.current = [];
      bufRef.current = "";
      skipRef.current = true;
      setSpeaking(false);
    }
  }, [enabled]);

  // 后台合成循环:把队列里还没有 blob 的块按序合成(一次一个;循环体重新检查队列,
  // 播放期间新入队的块也会被顺带合成)。
  const ensureSynth = useCallback(async () => {
    if (synthBusyRef.current) return;
    synthBusyRef.current = true;
    try {
      while (queueRef.current.length) {
        const item = queueRef.current.find((q) => q.blob === null);
        if (!item) break;
        const id = tokenRef.current;
        let blob: Blob | null = null;
        try {
          blob = await synthesizeAudio(item.text);
        } catch {
          blob = null; // TTS 失败:该块静默跳过,文字不受影响
        }
        if (id !== tokenRef.current) return; // 已停止/新一轮:丢弃
        item.blob = blob;
      }
    } finally {
      synthBusyRef.current = false;
    }
  }, []);

  /** 等待某块合成完成(最多轮询到该块就绪或本轮失效)。 */
  const waitForBlob = useCallback(async (item: { blob: Blob | null }, id: number) => {
    while (item.blob === null && id === tokenRef.current) {
      await new Promise((r) => setTimeout(r, 80));
    }
    return id === tokenRef.current;
  }, []);

  const pump = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    try {
      while (queueRef.current.length) {
        const id = tokenRef.current;
        const item = queueRef.current[0];

        if (item.blob === null) {
          void ensureSynth(); // 后台开合成(若未在跑)
          const stillCurrent = await waitForBlob(item, id);
          if (!stillCurrent) break;
          if (item.blob === null) {
            queueRef.current.shift();
            continue; // 合成失败:跳过这块
          }
        }

        const blob = item.blob as Blob;
        queueRef.current.shift();
        void ensureSynth(); // 播放期间预取下一块(及之后所有已入队的块)

        const audio = new Audio(URL.createObjectURL(blob));
        audioRef.current = audio;
        setSpeaking(true);

        let played = false;
        try {
          await audio.play();
          played = true;
        } catch {
          /* autoplay 被浏览器拦截:跳过这块 */
        }
        if (!played) {
          URL.revokeObjectURL(audio.src);
          audioRef.current = null;
          continue;
        }

        await new Promise<void>((resolve) => {
          const done = () => {
            audio.removeEventListener("ended", done);
            audio.removeEventListener("error", done);
            resolve();
          };
          audio.addEventListener("ended", done);
          audio.addEventListener("error", done);
        });
        URL.revokeObjectURL(audio.src);
        audioRef.current = null;

        if (id !== tokenRef.current) break; // 播放途中被停止
      }
    } finally {
      playingRef.current = false;
      if (queueRef.current.length) {
        void pump(); // 播放期间又有新块入队:继续
      } else {
        setSpeaking(false);
      }
    }
  }, [ensureSynth, waitForBlob]);

  const enqueue = useCallback(
    (texts: string[]) => {
      if (!texts.length) return;
      for (const t of texts) {
        if (t) queueRef.current.push({ text: t, blob: null });
      }
      void ensureSynth();
      void pump();
    },
    [ensureSynth, pump]
  );

  const feedToken = useCallback(
    (token: string) => {
      if (!enabledRef.current || skipRef.current || !token) return;
      bufRef.current += token;
      const { emitted, rest } = popChunk(bufRef.current);
      bufRef.current = rest;
      if (emitted) enqueue([emitted]);
    },
    [enqueue]
  );

  const flush = useCallback(() => {
    if (!enabledRef.current || skipRef.current) {
      bufRef.current = "";
      return;
    }
    const rest = bufRef.current.trim();
    bufRef.current = "";
    if (rest) enqueue([rest]);
  }, [enqueue]);

  const startStream = useCallback(() => {
    tokenRef.current += 1;
    audioRef.current?.pause();
    audioRef.current?.removeAttribute("src");
    audioRef.current = null;
    queueRef.current = [];
    bufRef.current = "";
    skipRef.current = false;
    setSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    audioRef.current?.pause();
    audioRef.current?.removeAttribute("src");
    audioRef.current = null;
    queueRef.current = [];
    bufRef.current = "";
    skipRef.current = true;
    setSpeaking(false);
  }, []);

  const speakNow = useCallback(
    (text: string) => {
      if (!text) return;
      tokenRef.current += 1;
      audioRef.current?.pause();
      audioRef.current?.removeAttribute("src");
      audioRef.current = null;
      queueRef.current = [];
      const chunks = chunkify(text);
      enqueue(chunks.length ? chunks : [text.trim()]);
    },
    [enqueue]
  );

  const toggle = useCallback(() => setEnabled((prev) => !prev), []);

  return { enabled, speaking, toggle, stop, startStream, feedToken, flush, speakNow };
}
