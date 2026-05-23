import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRoomContext, useParticipants } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

export default function TranscriptStrip() {
  const room = useRoomContext();
  const participants = useParticipants();
  const endRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const agentParticipant = participants.find((participant) => !participant.isLocal);
  const agentName = agentParticipant?.name || agentParticipant?.identity || 'Alex';

  const handleDataReceived = useCallback(
    (payload, participant, _kind, topic) => {
      if (topic !== 'lk-chat-topic') return;
      try {
        const decoded = new TextDecoder().decode(payload);
        const data = JSON.parse(decoded);
        const msg = {
          id: `${data.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
          message: data.message || decoded,
          role: data.role || (participant?.isLocal ? 'user' : 'agent'),
          timestamp: data.timestamp || Date.now(),
        };
        setMessages((prev) => [...prev, msg]);
      } catch {
        // ignore malformed data
      }
    },
    [],
  );

  useEffect(() => {
    if (!room) return;
    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, handleDataReceived]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  return (
    <div className="relative h-40 flex-shrink-0 border-t border-maneuver-border bg-maneuver-card px-[14px] py-3">
      <div className="transcript-top-fade pointer-events-none absolute left-0 right-0 top-0 z-10 h-8" />
      <div className="h-full overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-maneuver-muted">
            Transcript will appear here...
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className={`text-[11px] font-semibold leading-4 ${
                      isUser ? 'text-maneuver-teal' : 'text-maneuver-accent'
                    }`}
                  >
                    {isUser ? 'You' : agentName}
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
