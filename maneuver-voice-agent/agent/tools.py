import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import aiofiles
from livekit.agents import llm


current_lead: dict[str, str] = {}
_room_ctx: Any = None
_frontend_identity: Optional[str] = None
_LEADS_PATH = Path(__file__).with_name("leads.json")


def set_room_context(room: Any) -> None:
    global _room_ctx
    _room_ctx = room


def cache_frontend_identity(identity: str) -> None:
    global _frontend_identity
    _frontend_identity = identity


def _is_agent_identity(identity: str) -> bool:
    normalized = identity.lower()
    return "agent" in normalized or normalized.startswith("worker")


def _get_frontend_identity() -> Optional[str]:
    global _frontend_identity
    if _frontend_identity:
        return _frontend_identity
    if not _room_ctx:
        return None

    participants = getattr(_room_ctx, "remote_participants", {})
    values = participants.values() if isinstance(participants, dict) else participants
    for participant in values:
        identity = getattr(participant, "identity", None)
        if identity and not _is_agent_identity(identity):
            _frontend_identity = identity
            return identity
    return None


async def _rpc_call(method: str, payload: dict[str, Any]) -> None:
    if not _room_ctx:
        return

    identity = _get_frontend_identity()
    if not identity:
        return

    try:
        await _room_ctx.local_participant.perform_rpc(
            destination_identity=identity,
            method=method,
            payload=json.dumps(payload),
            response_timeout=5.0,
        )
    except Exception as exc:
        print(f"Frontend RPC failed for {method}: {exc}")


def _perform_frontend_rpc(method: str, payload: dict[str, Any]) -> None:
    asyncio.create_task(_rpc_call(method, payload))


async def _append_lead_to_file(lead: dict[str, Any]) -> None:
    try:
        async with aiofiles.open(_LEADS_PATH, "r", encoding="utf-8") as file:
            raw = await file.read()
        existing = json.loads(raw or "[]")
        if not isinstance(existing, list):
            existing = []
        existing.append(lead)
    except Exception:
        existing = [lead]

    async with aiofiles.open(_LEADS_PATH, "w", encoding="utf-8") as file:
        await file.write(json.dumps(existing, indent=2))


async def update_lead_field(field: str, value: str) -> dict[str, Any]:
    """Call this whenever the user reveals information about themselves during the discovery conversation. Field can be: 'name', 'company', 'role', 'problem', 'timeline', 'budget', 'contact_email'. Call once per field as soon as you have the value."""
    allowed_fields = {
        "name",
        "company",
        "role",
        "problem",
        "timeline",
        "budget",
        "contact_email",
    }
    if field not in allowed_fields:
        return {"success": False, "error": f"Unsupported lead field: {field}"}

    current_lead[field] = value
    _perform_frontend_rpc("update_lead_field", {"field": field, "value": value})
    return {"success": True, "lead": dict(current_lead)}


async def show_services_slide() -> dict[str, bool]:
    """Call this when the user asks what services Maneuver offers, what you do, or anything about your offerings."""
    _perform_frontend_rpc("show_visual", {"type": "services"})
    return {"success": True}


async def show_service_detail(service_name: str) -> dict[str, bool]:
    """Call this when the user asks about a specific service by name. service_name should be the slug from the knowledge base (e.g. 'mvp-build', 'product-discovery')."""
    _perform_frontend_rpc(
        "show_visual",
        {"type": "service_detail", "service": service_name},
    )
    return {"success": True}


async def show_process_diagram() -> dict[str, bool]:
    """Call this when the user asks about how Maneuver works, your process, how an engagement runs, or what working together looks like."""
    _perform_frontend_rpc("show_visual", {"type": "process"})
    return {"success": True}


async def show_case_study(client_slug: str) -> dict[str, bool]:
    """Call this when mentioning or asked about a specific case study or past client work."""
    _perform_frontend_rpc(
        "show_visual",
        {"type": "case_study", "client": client_slug},
    )
    return {"success": True}


async def save_lead_and_end() -> dict[str, Any]:
    """Call this when the discovery conversation is complete and you have collected enough information, or when the user indicates they want to wrap up. This saves the lead data."""
    lead = {
        **current_lead,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await _append_lead_to_file(lead)
    _perform_frontend_rpc("call_ended", lead)
    return {"success": True, "lead": lead}


class ManeuverFunctionContext(llm.FunctionContext):
    @llm.ai_callable()
    async def update_lead_field(self, field: str, value: str) -> dict[str, Any]:
        """Call this whenever the user reveals information about themselves during the discovery conversation. Field can be: 'name', 'company', 'role', 'problem', 'timeline', 'budget', 'contact_email'. Call once per field as soon as you have the value."""
        return await update_lead_field(field, value)

    @llm.ai_callable()
    async def show_services_slide(self) -> dict[str, bool]:
        """Call this when the user asks what services Maneuver offers, what you do, or anything about your offerings."""
        return await show_services_slide()

    @llm.ai_callable()
    async def show_service_detail(self, service_name: str) -> dict[str, bool]:
        """Call this when the user asks about a specific service by name. service_name should be the slug from the knowledge base (e.g. 'mvp-build', 'product-discovery')."""
        return await show_service_detail(service_name)

    @llm.ai_callable()
    async def show_process_diagram(self) -> dict[str, bool]:
        """Call this when the user asks about how Maneuver works, your process, how an engagement runs, or what working together looks like."""
        return await show_process_diagram()

    @llm.ai_callable()
    async def show_case_study(self, client_slug: str) -> dict[str, bool]:
        """Call this when mentioning or asked about a specific case study or past client work."""
        return await show_case_study(client_slug)

    @llm.ai_callable()
    async def save_lead_and_end(self) -> dict[str, Any]:
        """Call this when the discovery conversation is complete and you have collected enough information, or when the user indicates they want to wrap up. This saves the lead data."""
        return await save_lead_and_end()
