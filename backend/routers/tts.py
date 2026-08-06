"""TTS 语音播报路由：POST /api/tts 逐句合成 wav。

音色走设置页配置（ServiceSettings.tts_voice），key 与 STT 共用 DashScope API Key。
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.llm_provider import resolve_tts_config
from backend.tts import DEFAULT_VOICE, VOICES, clean_for_tts, stream_tts

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api", tags=["tts"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


@router.post("/tts")
async def synthesize(req: TTSRequest, user_id: str = Depends(get_current_user)):
    """合成一句话为 wav。DashScope 失败时前端静默跳过音频，不影响文字。

    连接 + 首个音频块在返回响应前取到，这样网络/服务错误能以 502 呈现，
    而不是在已开始的流中间断掉。
    """
    cfg = resolve_tts_config(user_id)
    if not cfg["api_key"]:
        raise HTTPException(400, "DashScope API Key 未配置")

    voice = cfg["voice"] or DEFAULT_VOICE
    if voice not in VOICES:
        voice = DEFAULT_VOICE  # 非法/过期音色回落默认

    text = clean_for_tts(req.text)
    if not text:
        raise HTTPException(400, "Empty text after cleaning.")

    gen = stream_tts(text, voice, api_key=cfg["api_key"])
    try:
        first = await anext(gen)
    except StopAsyncIteration:
        raise HTTPException(502, "TTS returned no audio.")
    except Exception as exc:
        logger.exception("DashScope TTS synthesis failed")
        raise HTTPException(502, f"TTS service unavailable: {exc}")

    async def body():
        yield first
        async for chunk in gen:
            yield chunk

    return StreamingResponse(body(), media_type="audio/wav")
