import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRoomContext } from '@livekit/components-react';
import ServicesSlide from '../slides/ServicesSlide.jsx';
import ProcessDiagram from '../slides/ProcessDiagram.jsx';
import ServiceDetail from '../slides/ServiceDetail.jsx';
import { parseRpcPayload } from '../rpcPayload.js';

const CASE_STUDIES = {
  'freight-brokerage': {
    client: 'Freight Brokerage',
    industry: 'Logistics & Supply Chain',
    problem: 'Manual freight operations creating bottlenecks across dispatch, tracking, and customer comms. Dispatchers spent hours on repetitive tasks instead of managing exceptions.',
    solution:
      'Deployed intelligent automation for order intake, carrier matching, dispatch generation, and real-time status tracking with proactive exception alerts.',
    outcome: '3+ hrs recovered per dispatcher per day, zero manual status updates, deployed in 4 weeks. Decoupled headcount growth from shipment volume.',
    service: 'Agentic AI',
    duration: '4 weeks',
  },
  'hospitality-group': {
    client: 'Hospitality Group',
    industry: 'Hospitality & Property Management',
    problem: 'Multi-property vacation rental group running on spreadsheets, WhatsApp groups, and disconnected tools — no unified system, no visibility, no scalability.',
    solution:
      'Built a complete guest operations platform with AI concierge across WhatsApp, Airbnb, and Booking.com, automated guest journey messaging, multi-level escalation, and operations dashboard.',
    outcome: '80% of guest communication handled automatically, 3 channels unified into one platform, 24/7 AI concierge availability. Properties scale without proportional staff growth.',
    service: 'Voice AI Concierge',
    duration: '8 weeks',
  },
  'industrial-supplier': {
    client: 'Industrial Supplier',
    industry: 'Industrial & B2B Supply Chain',
    problem: 'Supplier and customer communication scattered across WhatsApp, calls, and email — no centralized system, frequent errors, slow response times.',
    solution:
      'Built a unified communication layer with WhatsApp automation and Voice AI agent handling orders, confirmations, and status inquiries across all channels.',
    outcome: 'Single source of truth for all orders, 3 channels consolidated into 1 system, 60%+ reduction in manual data entry. System scales with volume.',
    service: 'Voice AI Concierge + Agentic AI',
    duration: '6 weeks',
  },
};

const CASE_ALIASES = {
  'northstar-ledger': 'freight-brokerage',
  lumahire: 'hospitality-group',
  carepilot: 'industrial-supplier',
  finflow: 'freight-brokerage',
  stackpilot: 'hospitality-group',
  loophr: 'industrial-supplier',
};

const LEAD_LABELS = {
  name: 'Name',
  company: 'Company',
  role: 'Role',
  problem: 'Problem',
  timeline: 'Timeline',
  budget: 'Budget',
  contact_email: 'Contact Email',
  notes: 'Notes',
  timestamp: 'Timestamp',
};

function IdleScreen() {
  return (
    <div className="relative z-0 flex h-full flex-col items-center justify-center text-center">
      <div className="idle-pulse-circle absolute" />
      <div className="font-serif text-[36px] leading-none text-maneuver-text">Maneuver</div>
      <div className="mt-3 text-[14px] uppercase tracking-[0.1em] text-maneuver-muted">
        Strategy. Design. Build.
      </div>
      <div className="my-5 h-px w-12 bg-maneuver-border" />
      <div className="text-[12px] text-maneuver-muted">Start a conversation to explore &rarr;</div>
    </div>
  );
}

function normalizeSlug(slug) {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function CaseStudyCard({ clientSlug }) {
  const slug = normalizeSlug(clientSlug);
  const normalizedSlug = CASE_ALIASES[slug] || slug;
  const study = CASE_STUDIES[normalizedSlug];

  if (!study) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="rounded-xl border border-maneuver-border bg-maneuver-card p-6">
          <h2 className="font-serif text-[20px] text-maneuver-text">Case study not found ({clientSlug})</h2>
          <p className="mt-2 text-[12px] text-maneuver-muted">Ask Alex about another client story.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.article
      className="flex h-full items-center justify-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-maneuver-border bg-maneuver-card p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-serif text-[20px] leading-none text-maneuver-text">{study.client}</h2>
          <span className="rounded-full border border-[#1D6B5A] bg-[#0F3D35] px-2.5 py-1 text-[10px] font-semibold text-[#3BBFA0]">
            {study.industry}
          </span>
        </div>

        {[
          ['The problem', study.problem, 'text-maneuver-muted'],
          ['What we did', study.solution, 'text-maneuver-muted'],
          ['The outcome', study.outcome, 'text-maneuver-accent'],
        ].map(([label, text, colorClass]) => (
          <section key={label} className="border-t border-maneuver-border py-3 first:border-t-0 first:pt-0">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-maneuver-muted">
              {label}
            </h3>
            <p className={`text-[13px] leading-6 ${colorClass}`}>{text}</p>
          </section>
        ))}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-maneuver-border pt-3 text-[11px] text-maneuver-muted">
          <span>{study.service}</span>
          <span className="font-mono uppercase tracking-wide">{study.duration}</span>
        </div>
      </div>
    </motion.article>
  );
}

function CallEndedScreen({ leadData }) {
  const entries = Object.entries(leadData || {}).filter(([, value]) => value);

  return (
    <div className="flex h-full items-center justify-center text-center">
      <div>
        <h2 className="font-serif text-[28px] leading-tight text-maneuver-text">Thanks for your time.</h2>
        <p className="mt-2 text-[14px] text-maneuver-muted">We'll be in touch shortly.</p>

        <div className="mt-6 w-full max-w-[360px] rounded-xl border border-maneuver-border bg-maneuver-card p-5 text-left">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-maneuver-muted">
            Lead summary
          </h3>
          <div className="space-y-2.5">
            {entries.length === 0 ? (
              <p className="text-[12px] text-maneuver-muted">No lead fields were captured.</p>
            ) : (
              entries.map(([field, value]) => (
                <div key={field} className="grid grid-cols-[110px_1fr] gap-3 text-[12px] leading-5">
                  <span className="text-maneuver-muted">{LEAD_LABELS[field] || field}</span>
                  <span className="text-maneuver-text">{String(value)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function visualKey(currentVisual) {
  if (!currentVisual) {
    return 'idle';
  }

  return `${currentVisual.type}-${currentVisual.service || currentVisual.client || ''}`;
}

function renderVisual(currentVisual) {
  if (!currentVisual) {
    return <IdleScreen />;
  }

  if (currentVisual.type === 'services') {
    return <ServicesSlide />;
  }

  if (currentVisual.type === 'service_detail') {
    return <ServiceDetail service={currentVisual.service} />;
  }

  if (currentVisual.type === 'process') {
    return <ProcessDiagram />;
  }

  if (currentVisual.type === 'case_study') {
    return <CaseStudyCard clientSlug={currentVisual.client} />;
  }

  if (currentVisual.type === 'call_ended') {
    return <CallEndedScreen leadData={currentVisual.leadData} />;
  }

  return <IdleScreen />;
}

function ConnectionDot({ state }) {
  const colorClass =
    state === 'connected'
      ? 'bg-maneuver-teal'
      : state === 'connecting'
        ? 'connecting-dot bg-amber-400'
        : 'bg-maneuver-muted';

  return <span className={`h-2 w-2 rounded-full ${colorClass}`} title={state || 'disconnected'} />;
}

export default function VisualPanel({ callEndedLead = null, externalVisual = undefined }) {
  const room = useRoomContext();
  const [currentVisual, setCurrentVisual] = useState(null);
  const [visualCounter, setVisualCounter] = useState(0);
  const connectionState = room?.state || 'disconnected';

  function applyVisual(visual) {
    setVisualCounter((counter) => counter + 1);
    setCurrentVisual(visual);
  }

  useEffect(() => {
    if (externalVisual !== undefined) {
      applyVisual(externalVisual.visual);
    }
  }, [externalVisual]);

  useEffect(() => {
    if (callEndedLead) {
      applyVisual({ type: 'call_ended', leadData: callEndedLead });
    }
  }, [callEndedLead]);

  useEffect(() => {
    if (!room?.localParticipant) {
      return undefined;
    }

    const handler = async (data) => {
      try {
        applyVisual(parseRpcPayload(data));
      } catch (error) {
        console.error('Failed to parse show_visual RPC payload:', error, data.payload);
      }
      return JSON.stringify({ success: true });
    };

    room.localParticipant.registerRpcMethod('show_visual', handler);
    return () => {
      room.localParticipant.unregisterRpcMethod?.('show_visual');
    };
  }, [room]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-10 flex-shrink-0 items-center justify-between border-b border-maneuver-border px-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-maneuver-muted">
          Maneuver
        </div>
        <ConnectionDot state={connectionState} />
      </header>
      <div className="min-h-0 flex-1 overflow-hidden p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${visualKey(currentVisual)}-${visualCounter}`}
            className="h-full"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderVisual(currentVisual)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
