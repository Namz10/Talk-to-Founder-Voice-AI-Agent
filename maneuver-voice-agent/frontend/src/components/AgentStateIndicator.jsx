import { useVoiceAssistant } from '@livekit/components-react';

const BAR_HEIGHTS = ['h-[8px]', 'h-[14px]', 'h-[10px]', 'h-[16px]', 'h-[8px]'];
const LISTENING_DELAYS = ['anim-delay-0', 'anim-delay-100', 'anim-delay-200', 'anim-delay-100', 'anim-delay-150'];
const THINKING_DELAYS = ['anim-delay-0', 'anim-delay-200', 'anim-delay-400'];

function ConnectingState() {
  return (
    <div className="flex items-center justify-center gap-6">
      <span className="connecting-dot h-2 w-2 rounded-full bg-maneuver-muted" />
      <span className="text-[11px] text-maneuver-muted">Connecting...</span>
    </div>
  );
}

function Bars({ mode }) {
  const isSpeaking = mode === 'speaking';

  return (
    <div className="flex h-6 items-end gap-1">
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={`${mode}-${height}-${index}`}
          className={`${height} w-[3px] origin-bottom rounded-full ${
            isSpeaking
              ? `speaking-bar bg-maneuver-accent ${LISTENING_DELAYS[index]}`
              : `listening-bar bg-maneuver-teal ${LISTENING_DELAYS[index]}`
          }`}
        />
      ))}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex h-6 items-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`thinking-dot-v2 h-1.5 w-1.5 rounded-full bg-maneuver-muted ${THINKING_DELAYS[index]}`}
        />
      ))}
    </div>
  );
}

export default function AgentStateIndicator({ forceState }) {
  const { state, agentState } = useVoiceAssistant();
  const currentState = forceState || state || agentState || 'connecting';

  if (currentState === 'listening') {
    return (
      <div className="flex items-center justify-center gap-6">
        <Bars mode="listening" />
        <span className="text-[11px] text-maneuver-teal">Listening</span>
      </div>
    );
  }

  if (currentState === 'thinking') {
    return (
      <div className="flex items-center justify-center gap-6">
        <ThinkingDots />
        <span className="text-[11px] text-maneuver-muted">Thinking...</span>
      </div>
    );
  }

  if (currentState === 'speaking') {
    return (
      <div className="flex items-center justify-center gap-6">
        <Bars mode="speaking" />
        <span className="text-[11px] text-maneuver-accent">Speaking</span>
      </div>
    );
  }

  return <ConnectingState />;
}
