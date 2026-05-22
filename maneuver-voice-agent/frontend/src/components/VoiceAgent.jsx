import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useLocalParticipant,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/components-react';
import AgentStateIndicator from './AgentStateIndicator.jsx';

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v5a3.5 3.5 0 0 0 3.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M18 10.5a6 6 0 0 1-12 0M12 16.5V21M9 21h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function VoiceAgent({ appState, onEndConversation }) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const { state, agentState } = useVoiceAssistant();
  const [isToggling, setIsToggling] = useState(false);
  const currentAgentState = agentState || state || 'idle';
  const isAgentSpeaking = currentAgentState === 'speaking';
  const isListening = currentAgentState === 'listening';
  const isConnected = room.state === 'connected';
  const isIdle = !isConnected || appState === 'connecting';

  async function toggleMicrophone() {
    if (!localParticipant || isAgentSpeaking || isToggling) {
      return;
    }

    setIsToggling(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } finally {
      setIsToggling(false);
    }
  }

  async function endConversation() {
    room.disconnect();
    onEndConversation?.();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <p className="mb-4 text-xs uppercase tracking-[0.18em] text-maneuver-muted">
        {appState === 'connected' ? 'Live conversation' : 'Connecting'}
      </p>
      <AgentStateIndicator />
      <motion.button
        type="button"
        onClick={toggleMicrophone}
        disabled={isAgentSpeaking || isToggling || !isConnected}
        title={isAgentSpeaking ? 'Alex is speaking...' : undefined}
        animate={isIdle ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ duration: 2, repeat: isIdle ? Infinity : 0 }}
        className={`mt-8 flex h-28 w-28 items-center justify-center rounded-full border transition ${
          isAgentSpeaking
            ? 'cursor-not-allowed border-maneuver-border bg-maneuver-card text-maneuver-muted opacity-50'
            : isMicrophoneEnabled
              ? 'border-maneuver-teal bg-maneuver-card text-maneuver-teal'
              : 'border-maneuver-accent bg-maneuver-accent text-white hover:brightness-110'
        } disabled:cursor-not-allowed`}
      >
        <MicIcon className="h-9 w-9" />
      </motion.button>
      <p className="mt-5 text-sm text-maneuver-muted">
        {isAgentSpeaking
          ? 'Alex is speaking'
          : isMicrophoneEnabled
            ? 'Microphone is open'
            : 'Start conversation'}
      </p>
      <button
        type="button"
        onClick={endConversation}
        className="mt-5 text-[12px] text-maneuver-muted underline-offset-4 transition hover:text-maneuver-text hover:underline"
      >
        End conversation
      </button>
    </div>
  );
}
