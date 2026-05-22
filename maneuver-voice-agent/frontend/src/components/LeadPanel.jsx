import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRoomContext } from '@livekit/components-react';

const FIELD_LABELS = {
  name: 'Name',
  company: 'Company',
  role: 'Role',
  problem: 'Problem',
  timeline: 'Timeline',
  budget: 'Budget',
  contact_email: 'Contact Email',
};

const EMPTY_LEAD = {
  name: '',
  company: '',
  role: '',
  problem: '',
  timeline: '',
  budget: '',
  contact_email: '',
};

export default function LeadPanel({ demoLeadPatch = null }) {
  const room = useRoomContext();
  const [leadFields, setLeadFields] = useState(EMPTY_LEAD);
  const isEmpty = Object.values(leadFields).every((value) => value === '');

  useEffect(() => {
    if (demoLeadPatch?.field && Object.prototype.hasOwnProperty.call(EMPTY_LEAD, demoLeadPatch.field)) {
      setLeadFields((prev) => ({ ...prev, [demoLeadPatch.field]: demoLeadPatch.value }));
    }
  }, [demoLeadPatch]);

  useEffect(() => {
    if (!room?.localParticipant) {
      return undefined;
    }

    const handler = async (data) => {
      try {
        const { field, value } = JSON.parse(data.payload || '{}');
        if (field && Object.prototype.hasOwnProperty.call(EMPTY_LEAD, field)) {
          setLeadFields((prev) => ({ ...prev, [field]: value }));
        }
      } catch (error) {
        console.error('Failed to parse update_lead_field RPC payload:', error, data.payload);
        if (data.payload && typeof data.payload === 'object') {
          const { field, value } = data.payload;
          if (field && Object.prototype.hasOwnProperty.call(EMPTY_LEAD, field)) {
            setLeadFields((prev) => ({ ...prev, [field]: value }));
          }
        }
      }
      return JSON.stringify({ success: true });
    };

    room.localParticipant.registerRpcMethod('update_lead_field', handler);
    return () => {
      room.localParticipant.unregisterRpcMethod?.('update_lead_field');
    };
  }, [room]);

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-maneuver-muted">
        Discovery Notes
      </h2>
      <AnimatePresence>
        {isEmpty && (
          <motion.p
            className="mb-4 text-[12px] leading-5 text-maneuver-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            Discovery notes will appear here as you talk with Alex.
          </motion.p>
        )}
      </AnimatePresence>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {Object.entries(FIELD_LABELS).map(([field, label]) => {
          const value = leadFields[field];
          return (
            <div
              key={field}
              className="grid grid-cols-[10px_120px_1fr] items-start gap-3 rounded-md border border-maneuver-border bg-maneuver-bg px-3 py-2.5"
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                  value ? 'bg-maneuver-teal' : 'bg-red-500'
                }`}
              />
              <span className="text-sm font-medium text-maneuver-muted">{label}</span>
              {value ? (
                <motion.span
                  key={value}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm leading-5 text-maneuver-text"
                >
                  {value}
                </motion.span>
              ) : (
                <span className="text-sm text-maneuver-muted">-</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
