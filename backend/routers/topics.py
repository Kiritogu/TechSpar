"""Topic management routes."""

import asyncio
import logging
import re
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from langchain_core.messages import HumanMessage, SystemMessage

from backend.auth import get_current_user
from backend.config import settings
from backend.indexer import (
    _read_pdf,
    invalidate_topic,
    load_topics,
    save_topics,
)
from backend.llm_provider import get_langchain_llm
from backend.memory import get_profile
from backend.prompts.interviewer import SUGGEST_TOPICS_PROMPT
from backend.utils import parse_json_response

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api")

MAX_RESUME_CHARS = 20000

# 与 frontend/src/utils/topicIcons.jsx 的 ICON_MAP 保持一致,供 LLM 建议的 icon 校验回退
_VALID_ICONS = {
    "FileText", "Brain", "Bot", "Library", "Wrench", "Plug", "Link", "Pencil",
    "Database", "HardDrive", "Settings", "Code", "Container", "Terminal",
    "Globe", "Cpu", "Network", "Shield", "Layers", "BookOpen",
    "Workflow", "Zap", "Server", "GitBranch", "Cloud", "Blocks", "Hash",
    "Binary", "Lock", "Rocket", "FolderCode", "MessageSquare",
}


def _make_topic_key(name: str, topics: dict) -> str:
    """Derive a unique topic key from a display name (fallback to uuid)."""
    base = re.sub(r"[^a-zA-Z0-9_-]", "", name) or uuid.uuid4().hex[:8]
    key = base
    i = 1
    while key in topics:
        key = f"{base}_{i}"
        i += 1
    return key


def _create_topic_resource(key: str, name: str, icon: str, user_id: str):
    """Create the knowledge dir + README for a topic (does not touch topics.json)."""
    topic_dir = settings.user_knowledge_path(user_id) / key
    topic_dir.mkdir(parents=True, exist_ok=True)
    readme = topic_dir / "README.md"
    if not readme.exists():
        readme.write_text(f"# {name}\n", encoding="utf-8")


@router.get("/topics")
def get_topics(
    include_hidden: bool = Query(False),
    user_id: str = Depends(get_current_user),
):
    """List available drill topics (with name and icon).

    By default only visible topics are returned; pass `include_hidden=true` to
    also see preset topics that were hidden by a resume-based suggestion."""
    return load_topics(user_id, include_hidden=include_hidden)


@router.post("/topics")
def create_topic(body: dict, user_id: str = Depends(get_current_user)):
    """Add a new topic."""
    name = body.get("name", "").strip()
    icon = body.get("icon", "📝").strip()
    if not name:
        raise HTTPException(400, "name is required")

    # include_hidden=True so we don't accidentally duplicate a hidden topic's key
    topics = load_topics(user_id, include_hidden=True)

    key = body.get("key", "").strip()
    if not key:
        key = _make_topic_key(name, topics)
    else:
        key = re.sub(r"[^a-zA-Z0-9_-]", "", key)
        if not key:
            key = _make_topic_key(name, topics)

    if key in topics:
        raise HTTPException(409, f"Topic '{key}' already exists")

    topics[key] = {"name": name, "icon": icon, "dir": key, "source": "user"}
    save_topics(topics, user_id)
    _create_topic_resource(key, name, icon, user_id)

    return {"ok": True, "key": key}


@router.delete("/topics/{key}")
def delete_topic(key: str, user_id: str = Depends(get_current_user)):
    """Remove a topic."""
    topics = load_topics(user_id)
    if key not in topics:
        raise HTTPException(404, f"Topic '{key}' not found")

    del topics[key]
    save_topics(topics, user_id)
    invalidate_topic(key, user_id)
    return {"ok": True}


@router.post("/topics/suggest")
async def suggest_topics(user_id: str = Depends(get_current_user)):
    """Suggest which drill domains to keep/create based on the uploaded resume.

    Non-persisting LLM call, mirroring /profile/infer-target-role. Returns
    `{keep_keys, new_topics}` for the frontend to present in a confirmation UI."""
    resume_dir = settings.user_resume_path(user_id)
    pdfs = [p for p in (resume_dir.glob("*.pdf") if resume_dir.exists() else [])]
    if not pdfs:
        raise HTTPException(400, "请先上传简历")

    try:
        text = (await asyncio.to_thread(_read_pdf, pdfs[0])).strip()
    except Exception as exc:
        raise HTTPException(500, f"读取简历失败: {exc}")
    if not text:
        raise HTTPException(500, "无法从 PDF 提取文本(可能是扫描件或图片型简历)")

    existing = load_topics(user_id, include_hidden=True)
    existing_lines = "\n".join(
        f"- {v.get('name', k)} (key: {k}, 来源: {'预置' if v.get('source') == 'preset' else '用户自建'})"
        for k, v in existing.items()
    )
    target_role = (get_profile(user_id).get("target_role") or "").strip() or "未指定"

    llm = get_langchain_llm(user_id)
    prompt = SUGGEST_TOPICS_PROMPT.format(
        resume_text=text[:MAX_RESUME_CHARS],
        target_role=target_role,
        existing_topics=existing_lines or "无",
    )
    messages = [
        SystemMessage(content="你是面试规划引擎。只返回 JSON，不要其他内容。"),
        HumanMessage(content=prompt),
    ]

    result = None
    last_error: Exception | None = None
    for _ in range(2):
        try:
            response = await asyncio.to_thread(llm.invoke, messages)
            candidate = parse_json_response(response.content)
            if not isinstance(candidate, dict):
                raise ValueError(f"expected dict, got {type(candidate)}")
            result = candidate
            break
        except Exception as exc:  # noqa: BLE001 - retry on any parse shape
            last_error = exc
            logger.warning(f"Topic suggest failed (attempt): {exc}")

    if result is None:
        logger.error(f"Topic suggest gave up: {last_error}")
        raise HTTPException(500, "领域建议生成失败，请重试")

    keep_keys = [str(k) for k in (result.get("keep_keys") or []) if str(k) in existing]
    new_topics = []
    for t in (result.get("new_topics") or [])[:5]:
        if not isinstance(t, dict):
            continue
        name = (t.get("name") or "").strip()
        if not name:
            continue
        icon = (t.get("icon") or "FileText").strip()
        if icon not in _VALID_ICONS:
            icon = "FileText"
        new_topics.append({
            "name": name,
            "icon": icon,
            "reason": (t.get("reason") or "").strip(),
        })

    return {"keep_keys": keep_keys, "new_topics": new_topics}


def _generate_knowledge_background(key: str, name: str, user_id: str):
    """Best-effort LLM generation of a new topic's core knowledge scaffolding."""
    try:
        llm = get_langchain_llm(user_id)
        response = llm.invoke([
            SystemMessage(content="你是一位资深面试官，擅长梳理一个领域的核心知识体系。"),
            HumanMessage(content=(
                f"请为「{name}」这个训练领域生成一份核心知识梳理，作为面试出题和评分的参考依据。\n\n"
                "要求：\n"
                "- 用 Markdown 格式\n"
                f"- 以 `# {name}` 作为标题\n"
                "- 列出该领域最核心的 8-12 个知识点，每个用二级标题\n"
                "- 每个知识点下用简洁的要点说明关键概念、原理、常见面试考点\n"
                "- 重点覆盖：核心概念、工作原理、最佳实践、常见陷阱\n"
                "- 面向面试准备场景\n"
                "- 直接输出 Markdown 内容，不要包裹在代码块中"
            )),
        ])
        content = (getattr(response, "content", None) or str(response)).strip()
        if content:
            topic_dir = settings.user_knowledge_path(user_id) / key
            topic_dir.mkdir(parents=True, exist_ok=True)
            (topic_dir / "README.md").write_text(content, encoding="utf-8")
            invalidate_topic(key, user_id)
    except Exception as exc:  # noqa: BLE001 - background, never crash the request
        logger.warning(f"Background knowledge generation failed for topic '{key}': {exc}")


@router.post("/topics/apply-suggestions")
def apply_topic_suggestions(
    body: dict,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """Confirm resume-based domain suggestions.

    Creates new topics, hides non-relevant preset topics, and (re)shows kept
    presets. User-created topics are never touched. New topics get their core
    knowledge generated in the background."""
    keep_keys = [str(k) for k in (body.get("keep_keys") or [])]
    new_topics = body.get("new_topics") or []

    topics = load_topics(user_id, include_hidden=True)

    created_keys = []
    existing_names = {v.get("name", "").strip().lower() for v in topics.values()}
    for t in new_topics:
        if not isinstance(t, dict):
            continue
        name = (t.get("name") or "").strip()
        if not name:
            continue
        if name.lower() in existing_names:
            continue  # already exists (visible or hidden) — don't duplicate
        icon = (t.get("icon") or "FileText").strip()
        if icon not in _VALID_ICONS:
            icon = "FileText"
        key = _make_topic_key(name, topics)
        topics[key] = {"name": name, "icon": icon, "dir": key, "source": "user"}
        _create_topic_resource(key, name, icon, user_id)
        existing_names.add(name.lower())
        created_keys.append(key)

    # Hide non-relevant presets; (re)show kept presets. User topics untouched.
    for key, topic in topics.items():
        if topic.get("source") != "preset":
            continue
        if key in keep_keys:
            topic["hidden"] = False
        else:
            topic["hidden"] = True

    save_topics(topics, user_id)

    for key, name in [(k, topics[k]["name"]) for k in created_keys]:
        background_tasks.add_task(_generate_knowledge_background, key, name, user_id)

    return {"ok": True, "created": created_keys,
            "visible_topics": load_topics(user_id)}


@router.post("/topics/{key}/restore")
def restore_topic(key: str, user_id: str = Depends(get_current_user)):
    """Un-hide a topic that was archived by a resume-based suggestion."""
    topics = load_topics(user_id, include_hidden=True)
    if key not in topics:
        raise HTTPException(404, f"Topic '{key}' not found")
    topics[key]["hidden"] = False
    save_topics(topics, user_id)
    return {"ok": True}