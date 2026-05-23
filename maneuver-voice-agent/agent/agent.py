import asyncio
import httpx
import json
import os
import time
from pathlib import Path
from typing import Any, Optional

from livekit.agents import llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import cartesia, deepgram, openai, silero

import tools
from tools import ManeuverFunctionContext


KB_PATH = Path(__file__).with_name("knowledge_base.md")

# Sliding window: keep system message + last N entries (user/assistant/tool turns).
# ~5 conversational exchanges is enough for a discovery call.
MAX_HISTORY_MESSAGES = 10
FIRST_TURN_FAST_HISTORY_MESSAGES = 4


def load_knowledge_base() -> str:
    return KB_PATH.read_text(encoding="utf-8")


def _before_llm_cb(agent: VoicePipelineAgent, chat_ctx: llm.ChatContext):
    """Trim chat history before each LLM call to cap context growth."""
    messages = chat_ctx.messages
    history_limit = FIRST_TURN_FAST_HISTORY_MESSAGES if len(messages) <= 4 else MAX_HISTORY_MESSAGES
    if len(messages) > history_limit + 1:
        # Keep the system message (index 0) + the most recent N messages
        chat_ctx.messages = [messages[0]] + messages[-history_limit:]
    # Return None to fall through to the default LLM.chat() call
    return None


def build_system_prompt(knowledge_base: str) -> str:
    return f"""You are Alex, the AI voice assistant for Maneuver. You are speaking directly with a visitor to the website via voice. Speak naturally, conversationally, and directly — like a founder on a quick discovery call. Keep responses to 2-3 sentences maximum. Never use bullet points or lists in speech. Never say 'certainly', 'absolutely', 'great question', or any filler affirmations.
Your EXACT opening line is: 'Hey — I'm Alex from Maneuver. Thanks for dropping by. Who am I talking with?' Nothing else. Then wait.

Knowledge Base:

{knowledge_base}

Discovery Mode (default):
Run a discovery call. After introductions, gather: name, company/project, the core problem, timeline, and rough budget range. Ask ONE question at a time. Branch naturally based on their answers. When you learn new information, call update_lead_fields once with ALL fields from that turn as a single JSON object (e.g. '{{"name":"Sarah","company":"Acme"}}').
If you learn only one field, call update_lead_field(field, value) immediately. Do not wait until the end of the conversation to capture lead data.
When a user describes their problem, ask ONE follow-up question that digs deeper before moving to timeline or budget.
Never ask 'what is your budget?' directly. Instead: 'Are you thinking project-based or ongoing support?' or 'Have you set aside a rough number, or still scoping?'

Q&A Mode:
If the visitor asks about Maneuver (services, process, pricing, case studies), answer from your knowledge. Call show_services_slide for service overviews. Call show_service_detail for a specific service. Call show_process_diagram for process questions. Call show_case_study when discussing a client story. Call visual tools BEFORE answering verbally.
If the user asks what Maneuver does, what work you do, what services you offer, what current work you have done, what you build, or asks about offerings, call show_services_slide BEFORE answering.
When the user asks about a specific service, use these exact service slugs: ai-readiness, agentic-ai, voice-ai, fractional-cto.
When the user asks about case studies, past work, examples, results, or clients, use ONLY the case studies in the Knowledge Base. Never invent clients. Use these exact mappings: logistics, dispatch, carriers, freight, brokerage -> show_case_study("freight-brokerage"); hospitality, hotel, Airbnb, guest ops, vacation rental -> show_case_study("hospitality-group"); industrial, supplier, WhatsApp, orders, supply chain -> show_case_study("industrial-supplier"). If the user asks generally for a case study, pick the most relevant one and call show_case_study before answering.

Rules:
Never read URLs. Never say 'as an AI'. If interrupted, stop immediately. End gracefully by calling save_lead_and_end when the user wraps up.
If challenged as a bot, say: 'Fair — I am an AI. But the questions I'm asking are the same ones we'd ask on a real call. Want to keep going?'"""


class ManeuverAgent:
    def __init__(self) -> None:
        knowledge_base = load_knowledge_base()
        system_prompt = build_system_prompt(knowledge_base)

        chat_ctx = llm.ChatContext()
        chat_ctx.append(role="system", text=system_prompt)

        deepgram_stt = deepgram.STT(model="nova-3", language="en-US")

        # LLM backend toggle: "gemini" (default) or "ollama"
        llm_backend = os.environ.get("LLM_BACKEND", "gemini").strip().lower()

        if llm_backend == "ollama":
            # Local LLM via Ollama (OpenAI-compatible endpoint)
            ollama_model = os.environ.get("OLLAMA_MODEL", "qwen3.5:2b")
            ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
            openai_llm = openai.LLM(
                model=ollama_model,
                api_key="ollama",
                base_url=ollama_base_url,
                parallel_tool_calls=False,
                timeout=httpx.Timeout(connect=15.0, read=60.0, write=15.0, pool=15.0),
            )
            print(f"LLM backend: Ollama ({ollama_model})")
            self._warmup_request = {
                "url": f"{ollama_base_url.rstrip('/')}/chat/completions",
                "headers": {"Authorization": "Bearer ollama"},
                "payload": {
                    "model": ollama_model,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
            }
        else:
            # Gemini via Google AI Studio (OpenAI-compatible endpoint)
            gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
            google_api_key = os.environ.get("GOOGLE_AI_API_KEY", "")
            if not google_api_key:
                raise ValueError(
                    "GOOGLE_AI_API_KEY is required when LLM_BACKEND=gemini. "
                    "Set it in your .env file or switch to LLM_BACKEND=ollama."
                )
            openai_llm = openai.LLM(
                model=gemini_model,
                api_key=google_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                parallel_tool_calls=False,
            )
            print(f"LLM backend: Gemini ({gemini_model})")
            self._warmup_request = {
                "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                "headers": {"Authorization": f"Bearer {google_api_key}"},
                "payload": {
                    "model": gemini_model,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
            }

        cartesia_tts = cartesia.TTS(
            model="sonic-2",
            voice="79a125e8-cd45-4c13-8a67-188112f4dd22",
        )
        silero_vad = silero.VAD.load(
            min_silence_duration=0.35,
            min_speech_duration=0.1,
            activation_threshold=0.5,
        )

        self._fnc_ctx = ManeuverFunctionContext()
        self._agent = VoicePipelineAgent(
            vad=silero_vad,
            stt=deepgram_stt,
            llm=openai_llm,
            tts=cartesia_tts,
            chat_ctx=chat_ctx,
            fnc_ctx=self._fnc_ctx,
            before_llm_cb=_before_llm_cb,
        )
        self._room: Optional[Any] = None
        self._closed = asyncio.Event()
        self._greeted = False
        self._silence_task: Optional[asyncio.Task] = None
        self._greeting_task: Optional[asyncio.Task] = None
        self._warmup_task: Optional[asyncio.Task] = None
        self._reengagement_count = 0
        self._user_turn_count = 0
        self._register_agent_handlers()

    def start(self, room: Any) -> None:
        self._room = room
        self._fnc_ctx.set_room(room)
        self._register_room_handlers(room)
        self._agent.start(room)
        self._warmup_task = asyncio.create_task(self._warm_llm_connection())
        if self._fnc_ctx.get_frontend_identity():
            self._start_greeting_task()

    async def run(self) -> None:
        await self._closed.wait()

    def stop(self) -> None:
        self._cancel_silence_watchdog()
        self._cancel_greeting_task()
        self._cancel_warmup_task()
        self._closed.set()

    async def _warm_llm_connection(self) -> None:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(4.0, connect=2.0)) as client:
                await client.post(
                    self._warmup_request["url"],
                    headers=self._warmup_request["headers"],
                    json=self._warmup_request["payload"],
                )
        except Exception as exc:
            print(f"Warning: LLM warmup skipped: {exc}")

    def _cancel_warmup_task(self) -> None:
        if self._warmup_task and not self._warmup_task.done():
            self._warmup_task.cancel()
        self._warmup_task = None

    async def _delayed_greeting(self) -> None:
        if self._greeted:
            return
        self._greeted = True
        await asyncio.sleep(0.25)
        await self._agent.say(
            "Hey — I'm Alex from Maneuver. Thanks for dropping by. Who am I talking with?",
            allow_interruptions=True,
        )
        self._restart_silence_watchdog()

    def _start_greeting_task(self) -> None:
        self._cancel_greeting_task()
        self._greeting_task = asyncio.create_task(self._delayed_greeting())

    def _cancel_greeting_task(self) -> None:
        if self._greeting_task and not self._greeting_task.done():
            self._greeting_task.cancel()
        self._greeting_task = None

    async def silence_watchdog(self, timeout: float = 9.0) -> None:
        """
        If no user speech is detected for `timeout` seconds, send a gentle
        re-engagement prompt. Maximum two re-engagements per call.
        """
        try:
            await asyncio.sleep(timeout)
            if self._reengagement_count >= 2:
                return
            self._reengagement_count += 1
            await self._agent.say(
                "Take your time — anything on your mind?",
                allow_interruptions=True,
            )
            self._restart_silence_watchdog()
        except asyncio.CancelledError:
            return

    def _restart_silence_watchdog(self) -> None:
        self._cancel_silence_watchdog()
        self._silence_task = asyncio.create_task(self.silence_watchdog())

    def _cancel_silence_watchdog(self) -> None:
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()
        self._silence_task = None

    def _publish_transcript(self, role: str, text: str) -> None:
        """Publish a transcript message to the lk-chat-topic data channel."""
        if not self._room or not text:
            return
        payload = json.dumps({
            "message": text,
            "role": role,
            "timestamp": int(time.time() * 1000),
        })
        asyncio.create_task(
            self._room.local_participant.publish_data(
                payload.encode("utf-8"),
                reliable=True,
                topic="lk-chat-topic",
            )
        )

    def _register_agent_handlers(self) -> None:
        @self._agent.on("user_started_speaking")
        def on_user_started_speaking(*_: Any) -> None:
            self._cancel_silence_watchdog()

        @self._agent.on("user_speech_committed")
        def on_user_speech_committed(msg: Any) -> None:
            self._cancel_silence_watchdog()
            # Publish user transcript to the frontend
            text = getattr(msg, "content", None) or str(msg)
            self._user_turn_count += 1
            self._fnc_ctx.trigger_visual_from_user_text(text)
            self._fnc_ctx.update_from_user_transcript(text, self._user_turn_count)
            self._publish_transcript("user", text)

        @self._agent.on("agent_started_speaking")
        def on_agent_started_speaking(*_: Any) -> None:
            self._cancel_silence_watchdog()

        @self._agent.on("agent_speech_committed")
        def on_agent_speech_committed(msg: Any) -> None:
            # Publish agent transcript to the frontend
            text = getattr(msg, "content", None) or str(msg)
            self._publish_transcript("agent", text)

        @self._agent.on("agent_stopped_speaking")
        def on_agent_stopped_speaking(*_: Any) -> None:
            self._restart_silence_watchdog()

    def _register_room_handlers(self, room: Any) -> None:
        @room.local_participant.register_rpc_method("end_conversation")
        async def on_end_conversation(data: Any) -> str:
            lead_result = await self._fnc_ctx.save_lead_and_end()
            self.stop()
            return json.dumps(lead_result)

        @room.on("participant_connected")
        def on_participant_connected(participant: Any) -> None:
            identity = getattr(participant, "identity", None)
            if identity and not self._fnc_ctx._is_agent_identity(identity):
                self._fnc_ctx.frontend_identity = identity
                self._start_greeting_task()

        @room.on("disconnected")
        def on_disconnected(*_: Any) -> None:
            asyncio.create_task(self._save_then_stop())

    async def _save_then_stop(self) -> None:
        await self._fnc_ctx.save_current_lead_if_needed("room_disconnected")
        self.stop()
