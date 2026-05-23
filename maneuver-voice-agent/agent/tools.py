import asyncio
import json
import re
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
    "notes",
}

VISUAL_CASE_KEYWORDS = {
    "freight-brokerage": (
        "logistics",
        "dispatch",
        "carrier",
        "carriers",
        "freight",
        "brokerage",
        "shipment",
        "shipments",
    ),
    "hospitality-group": (
        "hospitality",
        "hotel",
        "airbnb",
        "guest",
        "guests",
        "vacation rental",
        "property",
        "properties",
    ),
    "industrial-supplier": (
        "industrial",
        "supplier",
        "whatsapp",
        "orders",
        "supply chain",
        "inventory",
    ),
}

SERVICE_KEYWORDS = (
    "service",
    "services",
    "offering",
    "offerings",
    "what do you do",
    "what you do",
    "what can you build",
    "what do you build",
    "what work",
)

CASE_STUDY_KEYWORDS = (
    "case study",
    "case studies",
    "past work",
    "examples",
    "example",
    "results",
    "clients",
    "client story",
)

ROLE_WORDS = (
    "founder",
    "co-founder",
    "ceo",
    "cto",
    "coo",
    "cfo",
    "owner",
    "director",
    "manager",
    "lead",
    "head of",
    "product manager",
    "operator",
)


def _clean_phrase(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip(" .,!?:;\"'")).strip()


class ManeuverFunctionContext(llm.FunctionContext):
    def __init__(self) -> None:
        super().__init__()
        self.room: Optional[Any] = None
        self.current_lead: dict[str, str] = {}
        self._note_lines: list[str] = []
        self.frontend_identity: Optional[str] = None
        self._saved = False

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
        retries: int = 10,
        delay: float = 0.5,
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

    def _normalize_lead_field(self, field: str) -> Optional[str]:
        normalized = FIELD_ALIASES.get(field.lower().strip(), field.lower().strip())
        if normalized not in KNOWN_LEAD_FIELDS:
            print(f"Warning: unsupported lead field skipped: {field}")
            return None
        return normalized

    def _set_lead_field(self, field: str, value: Any) -> bool:
        normalized = self._normalize_lead_field(field)
        if not normalized:
            return False
        clean_value = _clean_phrase(str(value))
        if not clean_value:
            return False
        if self.current_lead.get(normalized) == clean_value:
            return False
        self.current_lead[normalized] = clean_value
        self._saved = False
        asyncio.create_task(
            self.perform_rpc_safe(
                "update_lead_field",
                {"field": normalized, "value": clean_value},
            )
        )
        return True

    def update_from_user_transcript(self, text: str, turn_index: int) -> dict[str, str]:
        updates: dict[str, str] = {}
        original = _clean_phrase(text)
        lowered = original.lower()
        if original and (not self._note_lines or self._note_lines[-1] != original):
            self._note_lines.append(original)
            updates["notes"] = " | ".join(self._note_lines[-4:])

        email_match = re.search(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", original)
        if email_match:
            updates["contact_email"] = email_match.group(0)

        name_company_match = re.search(
            r"\b(?:my name is|i am|i'm|im|this is|it's|its)\s+([a-z][a-z .'-]{1,50}?)(?:\s+(?:from|at|with)\s+([a-z0-9][a-z0-9 .&'-]{1,60}))?(?:[,.]|$)",
            lowered,
            flags=re.IGNORECASE,
        )
        if name_company_match:
            possible_name = _clean_phrase(name_company_match.group(1))
            if possible_name and not any(word in possible_name.lower() for word in ROLE_WORDS):
                updates["name"] = possible_name.title()
            if name_company_match.group(2):
                updates["company"] = _clean_phrase(name_company_match.group(2)).title()

        company_match = re.search(
            r"\b(?:company is|company's name is|we are|our company is|called|from|at)\s+([a-z0-9][a-z0-9 .&'-]{1,70})(?:[,.]|$)",
            lowered,
            flags=re.IGNORECASE,
        )
        if company_match and "company" not in updates:
            company = _clean_phrase(company_match.group(1))
            if company and not any(keyword in company for keyword in SERVICE_KEYWORDS + CASE_STUDY_KEYWORDS):
                updates["company"] = company.title()

        for role in ROLE_WORDS:
            if re.search(rf"\b{re.escape(role)}\b", lowered):
                updates["role"] = role.upper() if role in {"ceo", "cto", "coo", "cfo"} else role.title()
                break

        timeline_match = re.search(
            r"\b(?:in|within|by|over|next)\s+(\d+\s+(?:day|days|week|weeks|month|months)|q[1-4]\s+\d{4}|quarter|month|week|year)|\b(q[1-4]\s+\d{4}|asap|soon|next month|next quarter|this quarter)\b",
            lowered,
            flags=re.IGNORECASE,
        )
        if timeline_match:
            updates["timeline"] = _clean_phrase(timeline_match.group(0))

        budget_match = re.search(
            r"(?:\$|usd\s*)\s?\d[\d,]*(?:\s?(?:k|m|thousand|million))?(?:\s?[-–]\s?(?:\$|usd\s*)?\d[\d,]*(?:\s?(?:k|m|thousand|million))?)?|\b(?:project-based|retainer|ongoing support|monthly retainer)\b",
            lowered,
            flags=re.IGNORECASE,
        )
        if budget_match:
            updates["budget"] = _clean_phrase(budget_match.group(0))

        is_question_about_maneuver = any(keyword in lowered for keyword in SERVICE_KEYWORDS + CASE_STUDY_KEYWORDS)
        problem_signals = (
            "need",
            "looking for",
            "trying to",
            "want to",
            "build",
            "automate",
            "struggling",
            "problem",
            "issue",
            "pain",
            "help with",
            "we have",
        )
        if not is_question_about_maneuver and any(signal in lowered for signal in problem_signals):
            updates["problem"] = original
        elif turn_index >= 2 and "problem" not in self.current_lead and len(original.split()) >= 5 and not is_question_about_maneuver:
            updates["problem"] = original

        applied: dict[str, str] = {}
        for field, value in updates.items():
            if self._set_lead_field(field, value):
                applied[field] = self.current_lead[field]
        return applied

    def trigger_visual_from_user_text(self, text: str) -> Optional[dict[str, str]]:
        lowered = text.lower()

        if any(keyword in lowered for keyword in SERVICE_KEYWORDS):
            payload = {"type": "services"}
        elif any(keyword in lowered for keyword in CASE_STUDY_KEYWORDS):
            client = "freight-brokerage"
            for slug, keywords in VISUAL_CASE_KEYWORDS.items():
                if any(keyword in lowered for keyword in keywords):
                    client = slug
                    break
            payload = {"type": "case_study", "client": client}
        else:
            return None

        asyncio.create_task(self.perform_rpc_safe("show_visual", payload, retries=2, delay=0.1))
        return payload

    @llm.ai_callable()
    async def update_lead_field(self, field: str, value: str) -> dict[str, Any]:
        """Call this as soon as the user reveals one piece of lead information. Field can be name, company, role, problem, timeline, budget, or contact_email. Use this simple single-field tool when you learn one value."""
        updated = self._set_lead_field(field, value)
        return {"success": True, "updated": updated, "lead": dict(self.current_lead)}

    @llm.ai_callable()
    async def update_lead_fields(self, updates: str) -> dict[str, Any]:
        """Call this whenever the user reveals information about themselves.
        Pass a JSON object with ALL fields learned this turn, e.g.
        '{"name":"Sarah","company":"Acme"}'. Valid fields: name, company,
        role, problem, timeline, budget, contact_email."""
        try:
            parsed = json.loads(updates)
        except (json.JSONDecodeError, TypeError):
            return {"success": False, "error": "invalid JSON"}

        if not isinstance(parsed, dict):
            return {"success": False, "error": "expected a JSON object"}

        for field, value in parsed.items():
            self._set_lead_field(field, value)
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
        if self._saved:
            return {"success": True, "lead": dict(self.current_lead), "already_saved": True}
        if not self.current_lead:
            lead = {"save_reason": "no_discovery_notes_captured"}
            asyncio.create_task(self.perform_rpc_safe("call_ended", lead))
            return {"success": False, "lead": lead, "skipped": True}

        lead = {
            **self.current_lead,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._append_lead_to_file(lead)
        self._saved = True
        asyncio.create_task(self.perform_rpc_safe("call_ended", lead))
        return {"success": True, "lead": lead}

    async def save_current_lead_if_needed(self, reason: str = "disconnect") -> None:
        if self._saved or not self.current_lead:
            return
        lead = {
            **self.current_lead,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "save_reason": reason,
        }
        await self._append_lead_to_file(lead)
        self._saved = True
