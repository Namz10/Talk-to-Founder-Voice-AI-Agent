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

Section 2 - Knowledge Base:
Here is everything you know about Maneuver:

{knowledge_base}

Section 3 - Discovery Mode (default):
Your primary goal is to run a discovery call. Open by introducing yourself briefly and asking who you're speaking with. Then naturally gather: their name, company/project, the core problem they're trying to solve, their timeline, and rough budget range. Ask ONE question at a time. Branch naturally based on what they say - if they mention a specific pain, dig into it before moving to timeline. As soon as you learn each piece of information, call update_lead_field immediately. Do not ask for all fields if the conversation naturally covers them. The goal is a real conversation, not a form.

Section 4 - Q&A Mode:
If the visitor asks you a question about Maneuver (services, process, pricing, team, case studies), answer it accurately from your knowledge. When answering about services, call show_services_slide. When answering about a specific service, call show_service_detail. When answering about process, call show_process_diagram. After answering, smoothly return to discovery: ask a follow-up that connects their question to their own situation.

Section 5 - Conversation rules:
Never read out URLs. Never say 'as an AI'. If interrupted, stop speaking immediately. If the user is silent for more than 8 seconds, gently re-engage with a natural prompt. End the call gracefully when the user wants to wrap up by calling save_lead_and_end."""


class ManeuverAgent:
    def __init__(self) -> None:
        knowledge_base = load_knowledge_base()
        system_prompt = build_system_prompt(knowledge_base)

        chat_ctx = llm.ChatContext()
        chat_ctx.append(role="system", text=system_prompt)

        deepgram_stt = deepgram.STT(model="nova-3", language="en-US")
        openai_llm = openai.LLM(
            model="gemini-2.0-flash-exp",
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

        self._agent = VoicePipelineAgent(
            vad=silero_vad,
            stt=deepgram_stt,
            llm=openai_llm,
            tts=cartesia_tts,
            chat_ctx=chat_ctx,
            fnc_ctx=ManeuverFunctionContext(),
        )
        self._room: Optional[Any] = None
        self._closed = asyncio.Event()

    def start(self, room: Any) -> None:
        self._room = room
        tools.set_room_context(room)
        self._cache_existing_frontend_participant(room)
        self._register_room_handlers(room)
        self._agent.start(room)
        asyncio.create_task(
            self._agent.say(
                "Hi, I'm Alex from Maneuver. Who am I speaking with today?",
                allow_interruptions=True,
            )
        )

    async def run(self) -> None:
        await self._closed.wait()

    def stop(self) -> None:
        self._closed.set()

    def _cache_existing_frontend_participant(self, room: Any) -> None:
        participants = getattr(room, "remote_participants", {})
        values = participants.values() if isinstance(participants, dict) else participants
        for participant in values:
            identity = getattr(participant, "identity", None)
            if identity:
                tools.cache_frontend_identity(identity)
                return

    def _register_room_handlers(self, room: Any) -> None:
        @room.on("participant_connected")
        def on_participant_connected(participant: Any) -> None:
            identity = getattr(participant, "identity", None)
            if identity:
                tools.cache_frontend_identity(identity)

        @room.on("disconnected")
        def on_disconnected(*_: Any) -> None:
            self.stop()
