# Maneuver Talk to Founder Voice AI Agent

Production-oriented local demo for a founder-led voice agent that speaks with website visitors, answers questions about Maneuver, updates visual panels in real time, and saves captured lead details to `agent/leads.json`.

## Setup

1. Prerequisites: Python 3.11+, Node 20+, and ffmpeg installed.

2. Clone repo:

```bash
git clone <repo-url>
cd maneuver-voice-agent
```

3. Agent setup:

```bash
cd agent
pip install -r requirements.txt
cp .env.example .env
```

Fill in `agent/.env`:

- `LIVEKIT_URL`: your LiveKit Cloud websocket URL, from the LiveKit project settings.
- `LIVEKIT_API_KEY`: your LiveKit API key, from LiveKit Cloud.
- `LIVEKIT_API_SECRET`: your LiveKit API secret, from LiveKit Cloud.
- `DEEPGRAM_API_KEY`: your Deepgram API key.
- `CARTESIA_API_KEY`: your Cartesia API key.
- `GOOGLE_AI_API_KEY`: your Google AI Studio API key.

4. Frontend setup:

```bash
cd ../frontend
npm install
cp .env.example .env
```

Fill in `frontend/.env`:

- `VITE_LIVEKIT_URL`: the same LiveKit Cloud websocket URL.
- `VITE_LIVEKIT_API_KEY`: your LiveKit API key.
- `VITE_LIVEKIT_API_SECRET`: your LiveKit API secret.

This frontend token flow embeds LiveKit credentials in browser-accessible variables. That is acceptable only for this local demo. For production, token generation must move to a trusted backend endpoint.

5. Run agent:

```bash
cd ../agent
python main.py dev
```

6. Run frontend:

```bash
cd ../frontend
npm run dev
```

7. Open `http://localhost:5173` and click "Start conversation".

## Models & Why

- STT: Deepgram Nova-3 - lowest latency real-time ASR around 150ms, strong accuracy on conversational speech, and official LiveKit plugin support.
- LLM: Gemini 2.0 Flash - fast responses, strong function/tool calling, free via Google AI Studio, and usable through the OpenAI-compatible endpoint without custom model glue.
- TTS: Cartesia Sonic-2 - roughly 80ms TTFB, natural prosody for real-time voice, and official LiveKit plugin support.
- VAD: Silero - battle-tested local voice activity detection with reliable turn detection.

## Architecture

The frontend and Python agent join the same LiveKit room, `maneuver-demo`. The browser publishes microphone audio and subscribes to the agent audio. The Python worker receives audio through LiveKit, uses Deepgram for speech-to-text, Gemini through the OpenAI-compatible endpoint for reasoning and tool calls, Cartesia for speech synthesis, and Silero for turn detection.

The agent also controls the visual layer through LiveKit participant RPC. When the LLM calls a tool such as `show_services_slide`, the agent sends a `show_visual` RPC to the browser. When the visitor reveals lead details, `update_lead_field` updates local Python state and sends an `update_lead_field` RPC to the React lead panel. On wrap-up, `save_lead_and_end` appends the lead to `agent/leads.json` and sends `call_ended` to the frontend.

## What I'd do next (one week)

- Move token generation server-side with an Express or FastAPI endpoint.
- Add embeddings-based KB search for longer knowledge bases.
- Add multi-agent handoff to a scheduling agent on booking intent.
- Build an admin view with a past-calls dashboard and lead data.
- Trigger follow-up email through SendGrid on call end.
