# Maneuver — Talk to Founder

A real-time Voice AI agent that runs founder-style discovery calls and answers questions about Maneuver.

## What it does

Talk to Founder is a browser-based voice experience for Maneuver, a boutique product strategy and design studio. A visitor clicks "Start conversation" and talks with Alex Rivera, an AI founder persona that asks natural discovery questions, answers questions about Maneuver, and keeps the conversation moving like a short founder call.

The agent supports two modes in the same call. In discovery mode, it gathers lead context such as name, company, role, problem, timeline, budget, and contact email. In Q&A mode, it answers from Maneuver's local knowledge base and triggers synchronized visuals like service slides, process diagrams, service details, and case studies.

The frontend includes a live discovery notes panel, transcript strip, animated agent state indicator, and visual panel. On call end, captured lead data is appended to `maneuver-voice-agent/agent/leads.json`.

## Demo

Clone the repo, add API keys, run the Python agent and Vite frontend in two terminals, then open `http://localhost:5173`. Click "Start conversation", grant microphone access, and the agent should greet you, answer questions, update visuals, and save lead data on wrap-up.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Voice Framework | LiveKit Agents (Python) | Required; Python SDK most mature |
| STT | Deepgram Nova-3 | ~150ms latency, best conversational accuracy, official plugin |
| LLM | Gemini 2.0 Flash (Google AI Studio) | Fast tool calling, free tier, OpenAI-compatible endpoint |
| TTS | Cartesia Sonic-2 | ~80ms TTFB, most natural prosody for real-time voice |
| VAD | Silero | Battle-tested, runs locally, excellent turn detection |
| Frontend | React 18 + Vite + Tailwind | Fast local iteration and a small, focused UI surface |
| Animations | Framer Motion | Declarative, performant, AnimatePresence for transitions |

## Prerequisites

1. Python 3.11+
2. Node.js 20+
3. ffmpeg: Mac `brew install ffmpeg`, Ubuntu `sudo apt install ffmpeg`, Windows from `ffmpeg.org`
4. LiveKit Cloud account (free): `cloud.livekit.io`
5. Deepgram API key (free, 100hr/month): `deepgram.com`
6. Cartesia API key (free trial): `cartesia.ai`
7. Google AI Studio API key (free): `aistudio.google.com`

## Setup & Running

### 1. Clone

```bash
git clone <repo-url>
cd maneuver-voice-agent
```

### 2. Agent setup

```bash
cd agent
pip install -r requirements.txt
cp .env.example .env
```

Fill in your keys. See Environment Variables below.

### 3. Frontend setup

```bash
cd ../frontend
npm install
cp .env.example .env
```

Fill in your keys.

### 4. Run

Terminal 1 — Agent:

```bash
cd agent
python main.py dev
```

Terminal 2 — Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Click "Start conversation".

## Environment Variables

### agent/.env

| Variable | Where to get it |
|----------|----------------|
| LIVEKIT_URL | LiveKit Cloud dashboard → your project → Settings → `wss://xxx.livekit.cloud` |
| LIVEKIT_API_KEY | Same page, API Keys section |
| LIVEKIT_API_SECRET | Same page, API Keys section |
| DEEPGRAM_API_KEY | Deepgram Console → API Keys → Create Key |
| CARTESIA_API_KEY | Cartesia Dashboard → API Keys |
| GOOGLE_AI_API_KEY | Google AI Studio → Get API key |

### frontend/.env

| Variable | Value |
|----------|-------|
| VITE_LIVEKIT_URL | Same `wss://` URL as above |
| VITE_LIVEKIT_API_KEY | Same LiveKit API key as above |
| VITE_LIVEKIT_API_SECRET | Same LiveKit API secret as above |

Security note: embedding API credentials in frontend env vars is acceptable only for local development. In production, token generation must move to a server-side endpoint.

## Architecture

LiveKit is the connective tissue. The browser and Python agent both join the same LiveKit room as participants. Browser audio is published over WebRTC, the agent subscribes to it, and synthesized agent speech is published back into the room for the browser to play.

The voice pipeline runs in Python. Deepgram Nova-3 transcribes the user's speech, Gemini 2.0 Flash decides how to respond and when to call tools, and Cartesia Sonic-2 turns the response into low-latency speech. Silero VAD handles turn detection so the agent can listen, think, speak, and handle interruptions.

The visual layer is driven by LiveKit RPC. Gemini calls tools such as `show_services_slide` or `update_lead_field`; the Python agent forwards those tool calls to the browser with RPC; React updates the visual panel or discovery notes immediately. This optimistic rendering is why slides appear as the agent starts speaking, not after it finishes.

```text
Browser (React)
    |  WebRTC audio (bidirectional)
    |  RPC tool calls (agent -> browser)
    v
LiveKit Cloud (room server)
    |
    v
Python Agent
    |-- Deepgram Nova-3 (STT)
    |-- Gemini 2.0 Flash (LLM + tools)
    |-- Cartesia Sonic-2 (TTS)
    |
    v
leads.json (local)
```

## Visual Layer — How It Works

The agent defines tools such as `show_services_slide`, `show_service_detail`, `show_process_diagram`, `show_case_study`, and `update_lead_field`. When Gemini calls a visual tool, the agent sends a LiveKit RPC message to the frontend.

`VisualPanel.jsx` registers the `show_visual` RPC method and routes payloads to the right view. `LeadPanel.jsx` registers `update_lead_field` and animates captured fields into the notes panel. These frontend updates happen independently from TTS playback, so visuals can appear while the agent is speaking.

## Conversation Modes

Discovery mode is the default. The agent opens with a short founder-style greeting, asks one question at a time, digs into the visitor's product problem, and captures lead fields as soon as they are mentioned.

Q&A mode is triggered when the visitor asks about Maneuver's services, process, pricing, team, or case studies. The agent answers from `agent/knowledge_base.md`, calls the relevant visual tool first, then smoothly returns to discovery with a question tied to the visitor's situation.

## Lead Capture

Captured fields are `name`, `company`, `role`, `problem`, `timeline`, `budget`, and `contact_email`. On call end, `save_lead_and_end` appends the current lead to `maneuver-voice-agent/agent/leads.json` with a timestamp.

Example entry:

```json
{
  "name": "Priya Sharma",
  "company": "Buildfast",
  "role": "Co-founder",
  "problem": "Need to go from designs to MVP in 8 weeks",
  "timeline": "Q3 2025",
  "budget": "$50k-80k range",
  "contact_email": "priya@buildfast.example",
  "timestamp": "2026-05-21T14:32:11.204Z"
}
```

## What I'd Build Next (one more week)

1. Server-side token generation with a FastAPI endpoint to remove credential exposure in frontend env vars.
2. Embeddings-based knowledge base search to replace full context injection as the KB grows.
3. Scheduling agent handoff so booking intent routes to a CalendlyAgent that books a real call.
4. Admin dashboard in Next.js showing past leads, call duration, captured fields, and replay links.
5. Follow-up email trigger where GPT-4o summarizes the call and SendGrid sends a personalized follow-up.

## Known Limitations

- Token generation is client-side, which is local-development only.
- There is no authentication, so anyone with a valid local setup and URL can join the room.
- The knowledge base is injected into context, not vector-searched, which will hit limits with a larger KB.
- Gemini Flash can occasionally mis-fire tool calls; field normalization in `tools.py` handles common cases.
- Transcript display is in-session only; transcripts are not persisted across sessions.
- There is no call recording in this implementation.
