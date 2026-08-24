"""History and task status routes."""

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import get_current_user
from backend.memory import _save_profile, get_profile
from backend.runtime import _task_status
from backend.storage.sessions import (
    STATUS_REVIEW_FAILED,
    STATUS_REVIEWED,
    delete_session,
    expire_stale_reviewing,
    get_session,
    list_distinct_topics,
    list_sessions,
)

router = APIRouter(prefix="/api")


@router.get("/interview/review/{session_id}")
async def get_review(session_id: str, user_id: str = Depends(get_current_user)):
    """Get review for a completed session."""
    session = get_session(session_id, user_id=user_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    if not session.get("review"):
        raise HTTPException(400, "Interview not yet reviewed.")
    return session


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, user_id: str = Depends(get_current_user)):
    """Poll async task status.

    The in-memory task dict is lost on restart and never flips when a review
    hangs, so when there's no live "done"/"error" to report we reconcile against
    the persisted session — the source of truth — expiring stale reviews first.
    """
    task = _task_status.get(task_id)
    session = get_session(task_id, user_id=user_id)
    owns_retrospective = bool(
        task
        and task.get("type") == "retrospective"
        and task_id.endswith(f"_{user_id[:8]}")
    )
    if not session and not owns_retrospective:
        raise HTTPException(404, "Task not found.")

    if not task or task.get("status") not in ("done", "error"):
        expire_stale_reviewing(user_id=user_id)
        session = get_session(task_id, user_id=user_id)
        if session and session["status"] == STATUS_REVIEWED:
            return {"task_id": task_id, "status": "done"}
        if session and session["status"] == STATUS_REVIEW_FAILED:
            return {"task_id": task_id, "status": "error", "result": session.get("review_error")}
    if not task:
        raise HTTPException(404, "Task not found.")
    return {"task_id": task_id, **task}


@router.get("/interview/history")
async def get_history(
    limit: int = 20,
    offset: int = 0,
    mode: str = None,
    topic: str = None,
    user_id: str = Depends(get_current_user),
):
    """List past interview sessions with filtering and pagination."""
    expire_stale_reviewing(user_id=user_id)
    return list_sessions(user_id=user_id, limit=limit, offset=offset, mode=mode, topic=topic)


def _topic_of_session(session: dict) -> str:
    """主题优先取 session.topic,JD 备面类取 meta.position。"""
    if not session:
        return ""
    return session.get("topic") or (session.get("meta") or {}).get("position") or ""


def _remaining_session_topics(user_id: str) -> set:
    topics: set = set()
    result = list_sessions(user_id=user_id, limit=1000)
    for s in result.get("items", []):
        t = _topic_of_session(s)
        if t:
            topics.add(t)
    return topics


def _prune_orphaned_topic_profile(session: dict, user_id: str) -> None:
    """删除一条训练记录后,若该主题已无任何剩余训练记录,清理画像中该主题的沉淀,
    避免"删了记录但画像里还残留该领域的掌握度/薄弱点"。"""
    topic = _topic_of_session(session)
    if not topic or topic in _remaining_session_topics(user_id):
        return

    profile = get_profile(user_id)
    changed = False

    mastery = profile.get("topic_mastery")
    if isinstance(mastery, dict) and topic in mastery:
        del mastery[topic]
        changed = True

    wp = profile.get("weak_points")
    if isinstance(wp, list):
        filtered = [w for w in wp if w.get("topic") != topic]
        if len(filtered) != len(wp):
            profile["weak_points"] = filtered
            changed = True

    sp = profile.get("strong_points")
    if isinstance(sp, list):
        filtered = [s for s in sp if s.get("topic") != topic]
        if len(filtered) != len(sp):
            profile["strong_points"] = filtered
            changed = True

    if changed:
        _save_profile(profile, user_id)


@router.delete("/interview/session/{session_id}")
async def delete_session_endpoint(session_id: str, user_id: str = Depends(get_current_user)):
    """Delete a session record, and prune profile data for a topic that no longer
    has any remaining training record."""
    session = get_session(session_id, user_id=user_id)
    deleted = delete_session(session_id, user_id=user_id)
    if not deleted:
        raise HTTPException(404, "Session not found.")
    _prune_orphaned_topic_profile(session, user_id)
    return {"ok": True}


@router.get("/interview/topics")
async def get_interview_topics(user_id: str = Depends(get_current_user)):
    """List distinct topics from completed sessions (for filter dropdown)."""
    return list_distinct_topics(user_id=user_id)
