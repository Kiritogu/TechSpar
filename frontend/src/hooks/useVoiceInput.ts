import { useState, useRef, useCallback, useEffect } from "react";
import { transcribeAudio } from "../api/interview";

interface VoiceInputOptions {
  onResult?: (text: string) => void;
  /** 语音模式:转写成功后直接发送,不写入输入框。默认 false(追加式)。 */
  autoSend?: boolean;
  onAutoSend?: (text: string) => void;
  /** 转写结果为空/过短时回调(用于「没听清,请再说一次」提示)。 */
  onEmpty?: () => void;
  /** 录音时自动停麦:连续静音约 1.2s 自动停止。默认 false。 */
  autoStopSilence?: boolean;
}

export default function useVoiceInput({
  onResult,
  autoSend = false,
  onAutoSend,
  onEmpty,
  autoStopSilence = false,
}: VoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);
  const onAutoSendRef = useRef(onAutoSend);
  const onEmptyRef = useRef(onEmpty);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    onAutoSendRef.current = onAutoSend;
  }, [onAutoSend]);
  useEffect(() => {
    onEmptyRef.current = onEmpty;
  }, [onEmpty]);

  // Check if getUserMedia is available
  const isSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const stopSilenceMonitor = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    silenceStartRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const stopListening = useCallback(async () => {
    setIsListening(false);
    stopSilenceMonitor();

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    // Stop recording — triggers ondataavailable + onstop
    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Build audio blob from chunks
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];

        // Release microphone
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

        // Skip if too short (< 0.5s of data, likely accidental)
        if (blob.size < 1000) {
          onEmptyRef.current?.();
          resolve();
          return;
        }

        // Send to backend for transcription
        setIsTranscribing(true);
        try {
          const { text } = (await transcribeAudio(blob)) as { text?: string };
          const clean = (text || "").trim();
          if (clean) {
            if (autoSend && onAutoSendRef.current) {
              onAutoSendRef.current(clean);
            } else if (onResultRef.current) {
              onResultRef.current(clean);
            }
          } else {
            onEmptyRef.current?.();
          }
        } catch (err) {
          console.error("Transcription failed:", err);
          onEmptyRef.current?.();
        } finally {
          setIsTranscribing(false);
        }
        resolve();
      };

      recorder.stop();
    });
  }, [autoSend, stopSilenceMonitor]);

  const startListening = useCallback(async () => {
    if (!isSupported || isListening || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Collect data every 250ms
      setIsListening(true);

      // 静音自动停麦:AnalyserNode 监控 RMS,连续静音约 1.2s 自动停止
      if (autoStopSilence) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const audioCtx = new Ctx();
        await audioCtx.resume().catch(() => {});
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;

        const THRESHOLD = 0.015; // RMS 低于此视为静音
        const SILENCE_MS = 1200; // 连续静音时长,触发自动停麦
        const buffer = new Uint8Array(analyser.fftSize);

        const monitor = (ts: number) => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const v = (buffer[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buffer.length);

          if (rms < THRESHOLD) {
            if (silenceStartRef.current === null) silenceStartRef.current = ts;
            if (ts - silenceStartRef.current >= SILENCE_MS) {
              rafRef.current = null;
              void stopListening();
              return;
            }
          } else {
            silenceStartRef.current = null;
          }
          rafRef.current = requestAnimationFrame(monitor);
        };
        rafRef.current = requestAnimationFrame(monitor);
      }
    } catch (err) {
      console.error("Microphone access failed:", err);
      setIsListening(false);
      stopSilenceMonitor();
    }
  }, [isSupported, isListening, isTranscribing, autoStopSilence, stopListening, stopSilenceMonitor]);

  const cancel = useCallback(() => {
    // 放弃当前录音:直接丢弃,不转写、不发送。
    setIsListening(false);
    stopSilenceMonitor();
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    const discard = () => {
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
    };
    if (recorder.state === "recording") {
      recorder.onstop = discard;
      recorder.stop();
    } else {
      discard();
    }
  }, [stopSilenceMonitor]);

  const start = useCallback(() => {
    if (!isListening && !isTranscribing) void startListening();
  }, [isListening, isTranscribing, startListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      void stopListening();
    } else if (!isTranscribing) {
      void startListening();
    }
  }, [isListening, isTranscribing, stopListening, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSilenceMonitor();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current?.state !== "inactive") {
        try {
          mediaRecorderRef.current?.stop();
        } catch {
          /* cleanup, safe to ignore */
        }
      }
    };
  }, [stopSilenceMonitor]);

  return { isListening, isTranscribing, isSupported, start, toggle, cancel };
}
