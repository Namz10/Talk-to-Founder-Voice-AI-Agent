import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import VoiceAgent from './components/VoiceAgent.jsx';
import LeadPanel from './components/LeadPanel.jsx';
import VisualPanel from './components/VisualPanel.jsx';
import TranscriptStrip from './components/TranscriptStrip.jsx';
import { generateToken } from './tokenUtils.js';

const ROOM_NAME = 'maneuver-demo';

function randomIdentity() {
  return `visitor-${Math.random().toString(36).slice(2, 8)}`;
}

function IdleVisual() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-4 font-serif text-6xl text-maneuver-text">Maneuver</div>
      <div className="text-lg tracking-wide text-maneuver-muted">Strategy. Design. Build.</div>
    </div>
  );
}

function CallEndedBridge({ onEnded }) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room?.localParticipant) {
      return undefined;
    }

    const handler = async (data) => {
      const lead = JSON.parse(data.payload || '{}');
      onEnded(lead);
      return JSON.stringify({ success: true });
    };

    room.localParticipant.registerRpcMethod('call_ended', handler);
    return () => {
      room.localParticipant.unregisterRpcMethod?.('call_ended');
    };
  }, [room, onEnded]);

  return null;
}

function ConnectedExperience({ appState, onEnded, endedLead }) {
  return (
    <>
      <CallEndedBridge onEnded={onEnded} />
      <RoomAudioRenderer />
      <main className="flex h-screen overflow-hidden bg-maneuver-bg text-maneuver-text">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-maneuver-border bg-maneuver-card">
          <div className="min-h-0 flex-1 overflow-hidden p-6">
            <VisualPanel callEndedLead={endedLead} />
          </div>
          <TranscriptStrip />
        </section>
        <section className="flex w-[40%] min-w-[360px] flex-col bg-maneuver-bg">
          <div className="basis-[55%] p-6">
            <VoiceAgent appState={appState} />
          </div>
          <div className="h-px bg-maneuver-border" />
          <div className="min-h-0 basis-[45%] overflow-y-auto">
            <LeadPanel />
          </div>
        </section>
      </main>
    </>
  );
}

export default function App() {
  const [appState, setAppState] = useState('idle');
  const [token, setToken] = useState('');
  const [identity, setIdentity] = useState('');
  const [endedLead, setEndedLead] = useState(null);
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  async function startConversation() {
    try {
      setAppState('connecting');
      const participantName = randomIdentity();
      const signedToken = await generateToken(ROOM_NAME, participantName);
      setIdentity(participantName);
      setToken(signedToken);
    } catch (error) {
      console.error(error);
      setAppState('idle');
      alert(error.message);
    }
  }

  const handleEnded = useCallback((lead) => {
    setEndedLead(lead);
    setAppState('ended');
  }, []);

  if (!token) {
    return (
      <main className="flex h-screen overflow-hidden bg-maneuver-bg text-maneuver-text">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-maneuver-border bg-maneuver-card">
          <IdleVisual />
        </section>
        <section className="flex w-[40%] min-w-[360px] flex-col bg-maneuver-bg">
          <div className="flex basis-[55%] flex-col items-center justify-center border-b border-maneuver-border p-8 text-center">
            <p className="mb-3 text-sm uppercase tracking-[0.18em] text-maneuver-muted">
              Talk to founder
            </p>
            <button
              type="button"
              onClick={startConversation}
              disabled={appState === 'connecting'}
              className="soft-pulse rounded-full bg-maneuver-accent px-7 py-4 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
            >
              {appState === 'connecting' ? 'Connecting...' : 'Start conversation'}
            </button>
            <p className="mt-5 max-w-sm text-sm leading-6 text-maneuver-muted">
              Connect your microphone and speak directly with Alex Rivera.
            </p>
          </div>
          <div className="basis-[45%] p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-maneuver-muted">
              Discovery Notes
            </h2>
            <div className="space-y-3 text-maneuver-muted">
              {['Name', 'Company', 'Problem', 'Timeline', 'Budget'].map((field) => (
                <div key={field} className="flex items-center justify-between">
                  <span>{field}</span>
                  <span>&mdash;</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={identity}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio
          video={false}
          onConnected={() => setAppState('connected')}
          onDisconnected={() => {
            if (appState !== 'ended') {
              setAppState('idle');
              setToken('');
            }
          }}
        >
          <ConnectedExperience appState={appState} onEnded={handleEnded} endedLead={endedLead} />
        </LiveKitRoom>
      </motion.div>
    </AnimatePresence>
  );
}
