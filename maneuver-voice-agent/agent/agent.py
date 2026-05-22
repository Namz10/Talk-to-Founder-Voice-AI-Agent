import asyncio
import os
from pathlib import Path
from typing import Any, Optional

from livekit.agents import llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import cartesia, deepgram, openai, silero

import tools
from tools import ManeuverFunctionContext


KB_PATH = Path(__file__).with_name("knowledge_base.md")


def load_knowledge_base() -> str:
    return KB_PATH.read_text(encoding="utf-8")


def build_system_prompt(knowledge_base: str) -> str:
    return f"""Section 1 - Persona:
You are Alex Rivera, founder of Maneuver, a boutique product strategy and design studio. You are speaking directly with a visitor to your website via voice. Speak naturally, conversationally, and directly - like a founder on a quick discovery call, not a chatbot. Keep responses to 2-3 sentences maximum. Never use bullet points or lists in speech. Never say 'certainly', 'absolutely', 'great question', or any filler affirmations.
When starting the conversation, your EXACT opening is: 'Hey — I'm Alex. Thanks for dropping by. Who am I talking with?' Nothing before or after. No 'Hi there', no 'Welcome to Maneuver'. Just that line. Then wait.

Section 2 - Knowledge Base:
Here is everything you know about Maneuver:

{knowledge_base}

Section 3 - Discovery Mode (default):
Your primary goal is to run a discovery call. Open by introducing yourself briefly and asking who you're speaking with. Then naturally gather: their name, company/project, the core problem they're trying to solve, their timeline, and rough budget range. Ask ONE question at a time. Branch naturally based on what they say - if they mention a specific pain, dig into it before moving to timeline. As soon as you learn each piece of information, call update_lead_field immediately. Do not ask for all fields if the conversation naturally covers them. The goal is a real conversation, not a form.
When a user describes their problem, always ask exactly ONE follow-up question that digs deeper before moving to timeline or budget. For example, if they say 'we need a better app', ask 'What's the biggest pain your users hit right now?' before asking about timeline. The goal is to understand the problem genuinely, not collect fields.
Never ask 'what is your budget?' directly. Instead ask: 'Are you thinking project-based or would ongoing support make more sense?' and 'Have you set aside a rough number for this, or are you still scoping?' This feels natural and captures the same information.

Section 4 - Q&A Mode:
If the visitor asks you a question about Maneuver (services, process, pricing, team, case studies), answer it accurately from your knowledge. When answering about services, call show_services_slide. When answering about a specific service, call show_service_detail. When answering about process, call show_process_diagram. After answering, smoothly return to discovery: ask a follow-up that connects their question to their own situation.
Call visual tools BEFORE you start answering - not after. If the user asks about services, call show_services_slide first, then begin your verbal answer. The visual should appear as you speak, not after.

Section 5 - Conversation rules:
Never read out URLs. Never say 'as an AI'. If interrupted, stop speaking immediately. If the user is silent for more than 8 seconds, gently re-engage with a natural prompt. End the call gracefully when the user wants to wrap up by calling save_lead_and_end.
If the user is rude, dismissive, or says something like 'this is a bot' or 'you're not real', respond with: 'Fair — I am an AI. But the questions I'm asking are the same ones I'd ask on a real call. Want to keep going?' Then continue normally. Never apologize or break character."""


class ManeuverAgent:
    def __init__(self) -> None:
        knowledge_base = load_knowledge_base()
        system_prompt = build_system_prompt(knowledge_base)

        chat_ctx = llm.ChatContext()
        chat_ctx.append(role="system", text=system_prompt)

        deepgram_stt = deepgram.STT(model="nova-3", language="en-US")
        openai_llm = openai.LLM(
            model="gemini-2.5-flash",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=os.environ["GOOGLE_AI_API_KEY"],
        )
        cartesia_tts = cartesia.TTS(
            model="sonic-2",
            voice="79a125e8-cd45-4c13-8a67-188112f4dd22",
        )
        silero_vad = silero.VAD.load(
            min_silence_duration=0.6,
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
        )
        self._room: Optional[Any] = None
        self._closed = asyncio.Event()
        self._greeted = False
        self._silence_task: Optional[asyncio.Task] = None
        self._greeting_task: Optional[asyncio.Task] = None
        self._reengagement_count = 0
        self._register_agent_handlers()

    def start(self, room: Any) -> None:
        self._room = room
        self._fnc_ctx.set_room(room)
        self._register_room_handlers(room)
        self._agent.start(room)
        if self._fnc_ctx.get_frontend_identity():
            self._start_greeting_task()

    async def run(self) -> None:
        await self._closed.wait()

    def stop(self) -> None:
        self._cancel_silence_watchdog()
        self._cancel_greeting_task()
        self._closed.set()

    async def _delayed_greeting(self) -> None:
        if self._greeted:
            return
        self._greeted = True
        await asyncio.sleep(0.8)
        await self._agent.say(
            "Hey — I'm Alex. Thanks for dropping by. Who am I talking with?",
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

    def _register_agent_handlers(self) -> None:
        @self._agent.on("user_started_speaking")
        def on_user_started_speaking(*_: Any) -> None:
            self._cancel_silence_watchdog()

        @self._agent.on("user_speech_committed")
        def on_user_speech_committed(*_: Any) -> None:
            self._cancel_silence_watchdog()

        @self._agent.on("agent_started_speaking")
        def on_agent_started_speaking(*_: Any) -> None:
            self._cancel_silence_watchdog()

        @self._agent.on("agent_stopped_speaking")
        def on_agent_stopped_speaking(*_: Any) -> None:
            self._restart_silence_watchdog()

    def _register_room_handlers(self, room: Any) -> None:
        @room.on("participant_connected")
        def on_participant_connected(participant: Any) -> None:
            identity = getattr(participant, "identity", None)
            if identity:
                self._fnc_ctx.frontend_identity = identity
                self._start_greeting_task()

        @room.on("disconnected")
        def on_disconnected(*_: Any) -> None:
            self.stop()
