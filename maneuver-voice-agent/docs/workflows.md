# Runtime Workflows

This document describes the important runtime flows in the Talk to Founder app.

## 1. Application Startup

```mermaid
sequenceDiagram
    participant Dev
    participant AgentProcess
    participant TokenServer
    participant LiveKit
    participant Frontend

    Dev->>AgentProcess: python main.py dev
    AgentProcess->>TokenServer: Start HTTP server on :8080
    AgentProcess->>LiveKit: Register worker as maneuver-agent
    Dev->>Frontend: npm run dev
    Frontend->>Frontend: Serve React app on :5173
```

The Python process does two jobs:

- starts the local token server
- runs the LiveKit agent worker

The frontend is a separate Vite dev server.

## 2. Starting A Conversation

```mermaid
sequenceDiagram
    participant User
    participant React
    participant TokenServer
    participant LiveKit
    participant Agent

    User->>React: Clicks Start conversation
    React->>React: Generate visitor identity and room name
    React->>TokenServer: GET /api/token
    TokenServer-->>React: LiveKit participant JWT
    React->>LiveKit: Join room with microphone
    LiveKit->>Agent: Dispatch maneuver-agent
    Agent->>LiveKit: Join same room
    Agent->>User: Speaks greeting
```

The room name is randomized per conversation. This avoids stale participants and state collisions between demo runs.

## 3. Voice Turn

```mermaid
flowchart TD
    A["User speaks"] --> B["Browser publishes audio"]
    B --> C["LiveKit room"]
    C --> D["Python agent receives audio"]
    D --> E["Deepgram STT transcript"]
    E --> F["user_speech_committed event"]
    F --> G["Update notes and trigger visuals"]
    F --> H["Send prompt to Gemini"]
    H --> I["Optional LLM tool calls"]
    H --> J["Text response"]
    J --> K["Cartesia TTS"]
    K --> L["Agent audio back to browser"]
```

Important behavior:

- discovery notes update at `user_speech_committed`
- services/case-study visuals can appear before the agent finishes answering
- transcript messages are published as data-channel messages

## 4. Discovery Capture Workflow

Discovery capture has two layers.

### Layer 1: deterministic transcript capture

When a committed user transcript arrives, `tools.py`:

- appends the utterance to rolling `notes`
- looks for emails
- recognizes simple name/company patterns
- detects common role terms
- detects timeline phrases
- detects budget phrases
- stores problem-like utterances
- sends `update_lead_field` RPC updates to the frontend

This layer ensures the side panel and `leads.json` get useful information even if the LLM does not call a tool.

### Layer 2: LLM tools

The system prompt instructs the LLM to call:

- `update_lead_field(field, value)` for one field
- `update_lead_fields(updates)` for multiple fields learned in the same turn

This layer adds flexibility for phrasing that the deterministic layer may miss.

## 5. Q&A Mode Workflow

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Frontend
    participant LLM

    User->>Agent: "What services do you offer?"
    Agent->>Frontend: show_visual {"type":"services"}
    Agent->>LLM: Ask with KB context
    LLM-->>Agent: Conversational answer
    Agent-->>User: Speaks answer
    Agent->>User: Returns to discovery with a follow-up
```

Q&A mode is not a separate agent. It is a behavior within the same voice agent:

- user asks about Maneuver
- agent answers from `knowledge_base.md`
- frontend shows a matching visual
- agent returns to discovery naturally

## 6. Visual Routing Workflow

Visual payloads are simple JSON contracts.

```json
{ "type": "services" }
```

```json
{ "type": "case_study", "client": "freight-brokerage" }
```

```json
{ "type": "service_detail", "service": "voice-ai" }
```

`VisualPanel.jsx` receives these over `show_visual` RPC and routes to the matching React component.

## 7. Ending A Conversation

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Agent
    participant File

    User->>Browser: Clicks End conversation
    Browser->>Agent: RPC end_conversation
    Agent->>File: Append captured lead to leads.json
    Agent->>Browser: RPC call_ended with lead summary
    Browser->>Browser: Render final summary
    Browser->>LiveKit: Disconnect
```

The explicit `end_conversation` RPC prevents the most common failure mode: the browser disconnecting before the backend saves the lead.

## 8. Disconnect Safety Net

If the room disconnects without the browser calling `end_conversation`, the agent room disconnect handler calls `save_current_lead_if_needed`.

This saves the current lead if:

- there is captured lead data
- the lead has not already been saved

It skips empty leads to avoid timestamp-only entries.

