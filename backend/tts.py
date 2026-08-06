"""DashScope 语音合成(TTS)封装。

面试官语音播报后端：接收一句话 → DashScope qwen3-tts-flash（X-DashScope-SSE 流式，
返回 Base64 编码的 PCM 音频分片）→ 收集后拼成 WAV → 以 audio/wav 返回。
STT 与 TTS 共用 DashScope API Key（见 backend.llm_provider.resolve_dashscope_key），
音色在设置页按用户配置（backend.llm_provider.resolve_tts_config）。

合成前按句清洗 markdown，避免朗读出 ``*`` / ``#`` / ``[链接](url)`` 之类的标记符号。
"""

import base64
import json
import logging
import re
import struct

import httpx

from backend.llm_provider import resolve_dashscope_key

logger = logging.getLogger("uvicorn")

DEFAULT_VOICE = "Cherry"
# 音色名 → 中文标签（设置页下拉展示）。与 frontend/src/lib/providers.ts 的 TTS_VOICES 同源。
VOICE_LABELS = {
    "Cherry": "Cherry · 女 · 阳光积极",
    "Serena": "Serena · 女 · 温柔",
    "Ethan": "Ethan · 男 · 标准普通话",
    "Chelsie": "Chelsie · 女 · 二次元",
    "Momo": "Momo · 女 · 撒娇搞怪",
    "Vivian": "Vivian · 女 · 活泼可爱",
    "Moon": "Moon · 男 · 率性帅气",
    "Maia": "Maia · 女 · 知性温柔",
    "Kai": "Kai · 男 · 磁性低沉",
    "Neil": "Neil · 男 · 新闻主播",
    "Elias": "Elias · 女 · 知识讲解",
    "Vincent": "Vincent · 男 · 沙哑烟嗓",
    "Jennifer": "Jennifer · 女 · 美语电影感",
    "Nini": "Nini · 女 · 软糯甜妹",
    "Bella": "Bella · 女 · 元气萝莉",
}
VOICES = frozenset(VOICE_LABELS)

# DashScope 多模态生成端点（qwen3-tts-flash 走这里；新加坡地域换 dashscope-intl）
_DASHSCOPE_TTS_URL = (
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
)

# qwen3-tts-flash 固定输出 16-bit 单声道 24kHz 裸 PCM
_TTS_SAMPLE_RATE = 24000
_TTS_CHANNELS = 1
_TTS_BITS = 16

# TTS 前清洗顺序：链接 [x](url)→x → 行首列表符 → 残留 markdown 符号。
_MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_MD_BULLET = re.compile(r"^\s*[-+•]\s+", re.MULTILINE)
_MD_SYNTAX = re.compile(r"[`#*_>~]")


def clean_for_tts(text: str) -> str:
    """去掉 markdown / 控制字符，返回适合朗读的纯文本。"""
    if not text:
        return ""
    text = _MD_LINK.sub(r"\1", text)
    text = _MD_BULLET.sub("", text)
    text = _MD_SYNTAX.sub("", text)
    text = re.sub(r"\s+", " ", text)
    text = "".join(ch for ch in text if ch.isprintable() or ch == " ")
    return text.strip()


def wav_header(data_len: int) -> bytes:
    """给裸 PCM(16-bit 单声道 24kHz) 加 RIFF/WAVE 头。"""
    byte_rate = _TTS_SAMPLE_RATE * _TTS_CHANNELS * _TTS_BITS // 8
    block_align = _TTS_CHANNELS * _TTS_BITS // 8
    return struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_len, b"WAVE",
        b"fmt ", 16, 1, _TTS_CHANNELS, _TTS_SAMPLE_RATE, byte_rate, block_align, _TTS_BITS,
        b"data", data_len,
    )


async def stream_tts(text: str, voice: str = DEFAULT_VOICE, api_key: str | None = None):
    """合成一句话并 yield 完整 WAV 字节（DashScope SSE 流式收集 PCM 后拼装）。

    api_key 可选：显式传入则用它；否则走当前用户上下文（resolve_dashscope_key）。
    网络 / 鉴权 / 无音频等错误以异常抛出，由路由映射为 502。
    """
    key = api_key or resolve_dashscope_key()
    if not key:
        raise RuntimeError("DASHSCOPE_API_KEY not configured")

    payload = {
        "model": "qwen3-tts-flash",
        "input": {"text": text, "voice": voice, "language_type": "Auto"},
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "X-DashScope-SSE": "enable",
    }

    pcm = bytearray()
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            "POST", _DASHSCOPE_TTS_URL, headers=headers, json=payload
        ) as resp:
            if resp.status_code != 200:
                body = (await resp.aread()).decode("utf-8", "ignore")
                raise RuntimeError(f"DashScope TTS failed [{resp.status_code}]: {body[:400]}")

            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[len("data:"):].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    continue
                audio = event.get("output", {}).get("audio") or {}
                b64 = audio.get("data")
                if b64:
                    pcm.extend(base64.b64decode(b64))
                if event.get("output", {}).get("finish_reason") == "stop":
                    break

    if not pcm:
        raise RuntimeError("DashScope TTS returned no audio")

    yield wav_header(len(pcm)) + bytes(pcm)
