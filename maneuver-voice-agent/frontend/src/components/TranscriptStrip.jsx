import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useChat, useParticipants } from '@livekit/components-react';

export default function TranscriptStrip() {
  const { chatMessages = [] } = useChat();
  const participants = useParticipants();
  const endRef = useRef(null);
  const agentParticipant = participants.find((participant) => !participant.isLocal);
  const agentName = agentParticipant?.name || agentParticipant?.identity || 'Alex';

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [chatMessages]);

  return (
    <div className="relative h-40 flex-shrink-0 border-t border-maneuver-border bg-maneuver-card px-[14px] py-3">
      <div className="transcript-top-fade pointer-events-none absolute left-0 right-0 top-0 z-10 h-8" />
      <div className="h-full overflow-y-auto pr-1">
        {chatMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-maneuver-muted">
            Transcript will appear here...
          </div>
        ) : (
          <div className="space-y-2.5">
            {chatMessages.map((message) => {
              const isLocal = Boolean(message.from?.isLocal);
              return (
                <motion.div
                  key={message.id || `${message.timestamp}-${message.message}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className={`text-[11px] font-semibold leading-4 ${
                      isLocal ? 'text-maneuver-teal' : 'text-maneuver-accent'
                    }`}
                  >
                    {isLocal ? 'You' : agentName}
                  </div>
                  <div className="text-[12px] leading-[1.5] text-maneuver-muted">
                    {message.message}
                  </div>
                </motion.div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
