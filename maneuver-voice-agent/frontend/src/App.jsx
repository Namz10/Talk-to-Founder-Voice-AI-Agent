import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import VoiceAgent from './components/VoiceAgent.jsx';
import LeadPanel from './components/LeadPanel.jsx';
import VisualPanel from './components/VisualPanel.jsx';
import TranscriptStrip from './components/TranscriptStrip.jsx';
import DemoControls from './components/DemoControls.jsx';
import { generateToken } from './tokenUtils.js';
import { parseRpcPayload } from './rpcPayload.js';

function randomIdentity() {
  return `visitor-${Math.random().toString(36).slice(2, 8)}`;
}

function randomRoomName() {
  return `maneuver-demo-${Math.random().toString(36).slice(2, 8)}`;
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
      try {
        onEnded(parseRpcPayload(data));
      } catch (error) {
        console.error('Failed to parse call_ended RPC payload:', error, data.payload);
        onEnded({ error: 'Failed to parse lead details' });
      }
      return JSON.stringify({ success: true });
    };

    room.localParticipant.registerRpcMethod('call_ended', handler);
    return () => {
      room.localParticipant.unregisterRpcMethod?.('call_ended');
    };
  }, [room, onEnded]);

  return null;
}

function ConnectedExperience({ appState, onEnded, onEndConversation, endedLead, demoVisual, demoLeadPatch }) {
  return (
    <>
      <CallEndedBridge onEnded={onEnded} />
      <RoomAudioRenderer />
      <main className="flex h-screen overflow-hidden bg-maneuver-bg text-maneuver-text">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-maneuver-border bg-maneuver-card">
          <div className="min-h-0 flex-1 overflow-hidden">
            <VisualPanel callEndedLead={endedLead} externalVisual={demoVisual} />
          </div>
          <TranscriptStrip />
        </section>
        <section className="flex w-[40%] min-w-[360px] flex-col bg-maneuver-bg">
          <div className="basis-[55%] p-6">
            <VoiceAgent appState={appState} onEndConversation={onEndConversation} />
          </div>
          <div className="h-px bg-maneuver-border" />
          <div className="min-h-0 basis-[45%] overflow-y-auto">
            <LeadPanel demoLeadPatch={demoLeadPatch} />
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
  const [demoOpen, setDemoOpen] = useState(() => window.location.hash === '#demo');
  const [demoVisual, setDemoVisual] = useState(undefined);
  const [demoLeadPatch, setDemoLeadPatch] = useState(null);
  const manuallyEndedRef = useRef(false);
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL || import.meta.env.LIVEKIT_URL;

  useEffect(() => {
    function handleKeydown(event) {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setDemoOpen((isOpen) => !isOpen);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  async function startConversation() {
    try {
      setAppState('connecting');
      manuallyEndedRef.current = false;
      setEndedLead(null);
      setDemoVisual(undefined);
      setDemoLeadPatch(null);
      const participantName = randomIdentity();
      const roomName = randomRoomName();
      const signedToken = await generateToken(roomName, participantName);
      setIdentity(participantName);
      setToken(signedToken);
    } catch (error) {
      console.error(error);
      setAppState('idle');
      alert(error.message);
    }
  }

  const handleEnded = useCallback((lead) => {
    manuallyEndedRef.current = true;
    setEndedLead(lead);
    setAppState('ended');
  }, []);

  const handleManualEnd = useCallback((lead = null) => {
    manuallyEndedRef.current = true;
    setEndedLead(lead || {
      save_reason: 'manual_browser_end',
    });
    setAppState('ended');
  }, []);

  function handleDemoLeadField(field, value) {
    setDemoLeadPatch({ field, value, nonce: Date.now() });
  }

  const demoControls = demoOpen ? (
    <DemoControls
      onClose={() => setDemoOpen(false)}
      onSetVisual={(visual) => setDemoVisual({ visual, nonce: Date.now() })}
      onSetLeadField={handleDemoLeadField}
    />
  ) : null;

  if (!token) {
    return (
      <>
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
            <div className="min-h-0 basis-[45%] overflow-y-auto p-6">
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
        {demoControls}
      </>
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
            if (!manuallyEndedRef.current && appState !== 'ended') {
              setAppState('idle');
              setToken('');
            }
          }}
        >
          <ConnectedExperience
            appState={appState}
            onEnded={handleEnded}
            onEndConversation={handleManualEnd}
            endedLead={endedLead}
            demoVisual={demoVisual}
            demoLeadPatch={demoLeadPatch}
          />
          {demoControls}
        </LiveKitRoom>
      </motion.div>
    </AnimatePresence>
  );
}
