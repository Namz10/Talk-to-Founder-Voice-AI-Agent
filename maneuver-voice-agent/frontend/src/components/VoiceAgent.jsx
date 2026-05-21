import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useLocalParticipant,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/components-react';
import AgentStateIndicator from './AgentStateIndicator.jsx';

export default function VoiceAgent({ appState }) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const { state, agentState } = useVoiceAssistant();
  const [isToggling, setIsToggling] = useState(false);
  const currentAgentState = agentState || state || 'idle';
  const isAgentSpeaking = currentAgentState === 'speaking';
  const isListening = currentAgentState === 'listening';

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

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <p className="mb-4 text-xs uppercase tracking-[0.18em] text-maneuver-muted">
        {appState === 'connected' ? 'Live conversation' : 'Connecting'}
      </p>
      <AgentStateIndicator />
      <motion.button
        type="button"
        onClick={toggleMicrophone}
        disabled={isAgentSpeaking || isToggling || room.state !== 'connected'}
        animate={isListening && isMicrophoneEnabled ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 1.2, repeat: isListening && isMicrophoneEnabled ? Infinity : 0 }}
        className={`mt-8 flex h-28 w-28 items-center justify-center rounded-full border text-sm font-semibold transition ${
          isMicrophoneEnabled
            ? 'border-maneuver-accent bg-maneuver-accent text-white'
            : 'border-maneuver-border bg-maneuver-bg text-maneuver-muted'
        } disabled:cursor-not-allowed disabled:opacity-55`}
      >
        {isMicrophoneEnabled ? 'Mic on' : 'Mic off'}
      </motion.button>
      <p className="mt-5 text-sm text-maneuver-muted">
        {isAgentSpeaking
          ? 'Alex is speaking'
          : isMicrophoneEnabled
            ? 'Microphone is open'
            : 'Tap to unmute'}
      </p>
    </div>
  );
}
