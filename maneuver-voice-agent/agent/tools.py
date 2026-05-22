import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import aiofiles
from livekit.agents import llm


_LEADS_PATH = Path(__file__).with_name("leads.json")
_leads_lock = asyncio.Lock()

FIELD_ALIASES = {
    "email": "contact_email",
    "mail": "contact_email",
    "company_name": "company",
    "organization": "company",
    "org": "company",
    "title": "role",
    "job_title": "role",
    "position": "role",
    "deadline": "timeline",
    "timeframe": "timeline",
    "when": "timeline",
    "spend": "budget",
    "price": "budget",
    "cost": "budget",
}

KNOWN_LEAD_FIELDS = {
    "name",
    "company",
    "role",
    "problem",
    "timeline",
    "budget",
    "contact_email",
}


class ManeuverFunctionContext(llm.FunctionContext):
    def __init__(self) -> None:
        super().__init__()
        self.room: Optional[Any] = None
        self.current_lead: dict[str, str] = {}
        self.frontend_identity: Optional[str] = None

    def set_room(self, room: Any) -> None:
        self.room = room
        self._cache_existing_frontend_participant()

    def _is_agent_identity(self, identity: str) -> bool:
        normalized = identity.lower()
        return "agent" in normalized or normalized.startswith("worker")

    def _cache_existing_frontend_participant(self) -> None:
        if not self.room:
            return
        participants = getattr(self.room, "remote_participants", {})
        values = participants.values() if isinstance(participants, dict) else participants
        for participant in values:
            identity = getattr(participant, "identity", None)
            if identity and not self._is_agent_identity(identity):
                self.frontend_identity = identity
                return

    def get_frontend_identity(self) -> Optional[str]:
        if self.frontend_identity:
            return self.frontend_identity
        if not self.room:
            return None

        participants = getattr(self.room, "remote_participants", {})
        values = participants.values() if isinstance(participants, dict) else participants
        for participant in values:
            identity = getattr(participant, "identity", None)
            if identity and not self._is_agent_identity(identity):
                self.frontend_identity = identity
                return identity
        return None

    async def perform_rpc_safe(
        self,
        method: str,
        payload: dict[str, Any],
        retries: int = 3,
        delay: float = 0.3,
    ) -> None:
        """
        Attempt RPC call with retries. Finds the first non-agent remote participant.
        Retries up to `retries` times with `delay` seconds between attempts.
        Logs warning on failure, never raises.
        """
        if not self.room:
            print(f"Warning: no room available for RPC method {method}")
            return

        for attempt in range(1, retries + 1):
            identity = self.get_frontend_identity()
            if identity:
                try:
                    await self.room.local_participant.perform_rpc(
                        destination_identity=identity,
                        method=method,
                        payload=json.dumps(payload),
                        response_timeout=5.0,
                    )
                    return
                except Exception as exc:
                    print(f"Warning: RPC {method} attempt {attempt}/{retries} failed: {exc}")
            elif attempt == retries:
                print(f"Warning: no frontend participant found for RPC method {method}")

            if attempt < retries:
                await asyncio.sleep(delay)

    async def _append_lead_to_file(self, lead: dict[str, Any]) -> None:
        async with _leads_lock:
            existing = []
            backup_created = False
            raw_original = ""
            
            if _LEADS_PATH.exists():
                try:
                    async with aiofiles.open(_LEADS_PATH, "r", encoding="utf-8") as file:
                        raw_original = await file.read()
                    
                    if raw_original.strip():
                        existing = json.loads(raw_original)
                        if not isinstance(existing, list):
                            existing = []
                except Exception as exc:
                    print(f"Warning: failed reading leads.json: {exc}")
                    existing = []

            # Create backup of raw_original before write
            if raw_original:
                try:
                    backup_path = _LEADS_PATH.with_suffix(".json.bak")
                    async with aiofiles.open(backup_path, "w", encoding="utf-8") as backup_file:
                        await backup_file.write(raw_original)
                    backup_created = True
                except Exception as exc:
                    print(f"Warning: failed to create leads.json backup: {exc}")

            # Append the new lead
            existing.append(lead)

            # Write to leads.json
            try:
                async with aiofiles.open(_LEADS_PATH, "w", encoding="utf-8") as file:
                    await file.write(json.dumps(existing, indent=2))
            except Exception as write_exc:
                print(f"Error: failed writing leads.json: {write_exc}")
                # Try to restore from backup
                if backup_created and raw_original:
                    try:
                        async with aiofiles.open(_LEADS_PATH, "w", encoding="utf-8") as file:
                            await file.write(raw_original)
                        print("Successfully restored leads.json from backup.")
                    except Exception as restore_exc:
                        print(f"Critical: failed restoring leads.json from backup: {restore_exc}")
                return

            # Validate written content
            try:
                async with aiofiles.open(_LEADS_PATH, "r", encoding="utf-8") as file:
                    json.loads(await file.read())
            except Exception as val_exc:
                print(f"Error: leads.json validation failed after write: {val_exc}")
                # Try to restore from backup
                if backup_created and raw_original:
                    try:
                        async with aiofiles.open(_LEADS_PATH, "w", encoding="utf-8") as file:
                            await file.write(raw_original)
                        print("Successfully restored leads.json from backup due to validation failure.")
                    except Exception as restore_exc:
                        print(f"Critical: failed restoring leads.json from backup: {restore_exc}")

    @llm.ai_callable()
    async def update_lead_field(self, field: str, value: str) -> dict[str, Any]:
        """Call this whenever the user reveals information about themselves during the discovery conversation. Field can be: 'name', 'company', 'role', 'problem', 'timeline', 'budget', 'contact_email'. Call once per field as soon as you have the value."""
        normalized_field = FIELD_ALIASES.get(field.lower(), field.lower())
        if normalized_field not in KNOWN_LEAD_FIELDS:
            print(f"Warning: unsupported lead field skipped: {field}")
            return {"success": True, "skipped": True}

        self.current_lead[normalized_field] = value
        asyncio.create_task(
            self.perform_rpc_safe("update_lead_field", {"field": normalized_field, "value": value})
        )
        return {"success": True, "lead": dict(self.current_lead)}

    @llm.ai_callable()
    async def show_services_slide(self) -> dict[str, bool]:
        """Call this when the user asks what services Maneuver offers, what you do, or anything about your offerings."""
        asyncio.create_task(self.perform_rpc_safe("show_visual", {"type": "services"}))
        return {"success": True}

    @llm.ai_callable()
    async def show_service_detail(self, service_name: str) -> dict[str, bool]:
        """Call this when the user asks about a specific service by name. service_name should be the slug from the knowledge base (e.g. 'mvp-build', 'product-discovery')."""
        asyncio.create_task(
            self.perform_rpc_safe(
                "show_visual",
                {"type": "service_detail", "service": service_name},
            )
        )
        return {"success": True}

    @llm.ai_callable()
    async def show_process_diagram(self) -> dict[str, bool]:
        """Call this when the user asks about how Maneuver works, your process, how an engagement runs, or what working together looks like."""
        asyncio.create_task(self.perform_rpc_safe("show_visual", {"type": "process"}))
        return {"success": True}

    @llm.ai_callable()
    async def show_case_study(self, client_slug: str) -> dict[str, bool]:
        """Call this when mentioning or asked about a specific case study or past client work."""
        asyncio.create_task(
            self.perform_rpc_safe(
                "show_visual",
                {"type": "case_study", "client": client_slug},
            )
        )
        return {"success": True}

    @llm.ai_callable()
    async def save_lead_and_end(self) -> dict[str, Any]:
        """Call this when the discovery conversation is complete and you have collected enough information, or when the user indicates they want to wrap up. This saves the lead data."""
        lead = {
            **self.current_lead,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._append_lead_to_file(lead)
        asyncio.create_task(self.perform_rpc_safe("call_ended", lead))
        return {"success": True, "lead": lead}
