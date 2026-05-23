# API And Data Contracts

This document lists the local HTTP endpoint, LiveKit RPC methods, data-channel messages, and persisted data shape used by the project.

## Local HTTP Endpoint

### `GET /api/token`

Served by `agent/token_server.py` on port `8080`.

Query parameters:

| Name | Required | Description |
| --- | --- | --- |
| `roomName` | no | LiveKit room name. Defaults to `maneuver-demo`. |
| `participantName` | yes | Browser participant identity. |

Example:

```text
GET http://localhost:8080/api/token?roomName=maneuver-demo-abc123&participantName=visitor-k91md2
```

Success response:

```json
{
  "token": "<livekit-jwt>"
}
```

Error responses:

```json
{
  "error": "participantName is required"
}
```

```json
{
  "error": "Server credentials missing"
}
```

The token includes:

- room join permission
- room name
- publish permission
- subscribe permission
- data publish permission
- agent dispatch metadata when supported by the installed LiveKit API package

## Browser To Agent RPC

### `end_conversation`

Registered by the Python agent on `room.local_participant`.

Purpose:

- save the current lead before the browser disconnects
- return saved lead data to the frontend

Request payload:

```json
{
  "reason": "user_clicked_end"
}
```

Response payload:

```json
{
  "success": true,
  "lead": {
    "name": "Priya Sharma",
    "company": "Buildfast",
    "notes": "My name is Priya Sharma from BuildFast.",
    "timestamp": "2026-05-23T10:20:31.442921+00:00"
  }
}
```

Skipped empty response:

```json
{
  "success": false,
  "lead": {
    "save_reason": "no_discovery_notes_captured"
  },
  "skipped": true
}
```

## Agent To Browser RPC

### `show_visual`

Registered by `VisualPanel.jsx`.

Purpose:

- render synchronized visual content in the main panel

Payloads:

```json
{ "type": "services" }
```

```json
{
  "type": "service_detail",
  "service": "ai-readiness"
}
```

```json
{ "type": "process" }
```

```json
{
  "type": "case_study",
  "client": "freight-brokerage"
}
```

```json
{
  "type": "call_ended",
  "leadData": {
    "name": "Priya Sharma",
    "company": "Buildfast"
  }
}
```

Allowed service slugs:

| Slug | Label |
| --- | --- |
| `ai-readiness` | AI Readiness Sprint |
| `agentic-ai` | Agentic AI |
| `voice-ai` | Voice AI Concierge |
| `fractional-cto` | Fractional CTO |

Allowed case-study slugs:

| Slug | Case study |
| --- | --- |
| `freight-brokerage` | Freight Brokerage |
| `hospitality-group` | Hospitality Group |
| `industrial-supplier` | Industrial Supplier |

### `update_lead_field`

Registered by `LeadPanel.jsx`.

Purpose:

- update the discovery notes panel live

Payload:

```json
{
  "field": "company",
  "value": "Buildfast"
}
```

Allowed fields:

- `name`
- `company`
- `role`
- `problem`
- `timeline`
- `budget`
- `contact_email`
- `notes`

### `call_ended`

Registered by `App.jsx` through `CallEndedBridge`.

Purpose:

- move the frontend into the ended state
- show the captured lead summary

Payload:

```json
{
  "name": "Priya Sharma",
  "company": "Buildfast",
  "timestamp": "2026-05-23T10:20:31.442921+00:00"
}
```

## Transcript Data Channel

Topic:

```text
lk-chat-topic
```

Publisher:

- Python agent

Subscriber:

- `TranscriptStrip.jsx`

Payload:

```json
{
  "message": "What services do you offer?",
  "role": "user",
  "timestamp": 1779522031442
}
```

Roles:

- `user`
- `agent`

## Persisted Lead Schema

File:

```text
maneuver-voice-agent/agent/leads.json
```

Shape:

```json
[
  {
    "name": "Priya Sharma",
    "company": "Buildfast",
    "role": "Co-founder",
    "problem": "We need to automate customer support for our logistics clients.",
    "timeline": "in six weeks",
    "budget": "$50k",
    "contact_email": "priya@buildfast.example",
    "notes": "My name is Priya Sharma from BuildFast. | We need to automate customer support for our logistics clients.",
    "timestamp": "2026-05-23T10:20:31.442921+00:00",
    "save_reason": "room_disconnected"
  }
]
```

`save_reason` appears only when the disconnect safety net saves the lead. Normal explicit saves only include `timestamp`.

## Field Normalization

Aliases handled by the backend:

| Input | Stored field |
| --- | --- |
| `email`, `mail` | `contact_email` |
| `company_name`, `organization`, `org` | `company` |
| `title`, `job_title`, `position` | `role` |
| `deadline`, `timeframe`, `when` | `timeline` |
| `spend`, `price`, `cost` | `budget` |

## Security Notes

Current state:

- LiveKit API credentials stay in `agent/.env`.
- Browser receives only a generated participant token.
- CORS is permissive because this is a local assignment demo.

Production changes:

- restrict CORS origins
- add authentication to `/api/token`
- rate-limit token generation
- use short-lived JWTs
- add structured request logs
- move persistence to a database
