import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRoomContext } from '@livekit/components-react';
import ServicesSlide from '../slides/ServicesSlide.jsx';
import ProcessDiagram from '../slides/ProcessDiagram.jsx';
import ServiceDetail from '../slides/ServiceDetail.jsx';

const CASE_STUDIES = {
  finflow: {
    client: 'FinFlow',
    industry: 'Fintech',
    problem: 'High drop-off in onboarding - 68% of signups never connected their first account.',
    solution:
      'Redesigned onboarding with progressive disclosure and trust indicators. Ran 3-week discovery sprint before touching UI.',
    outcome: '41% reduction in onboarding drop-off. $2.3M Series A closed 6 weeks post-launch.',
    service: 'UX & Interface Design',
    duration: '6 weeks',
  },
  stackpilot: {
    client: 'StackPilot',
    industry: 'Developer Tools',
    problem: 'No coherent visual identity - looked like an internal tool, not a product.',
    solution:
      'Full brand identity system + design system. Created a technical-but-approachable aesthetic that resonated with senior engineers.',
    outcome: '3x increase in trial signups in 30 days post-rebrand. Featured on Product Hunt #2 of the day.',
    service: 'Brand Identity + Design System',
    duration: '8 weeks',
  },
  loophr: {
    client: 'LoopHR',
    industry: 'HR Tech',
    problem: 'Needed to go from Figma to working product in 10 weeks before a board demo.',
    solution:
      'MVP build from approved designs. Next.js app with Supabase backend, Stripe integration, and admin dashboard.',
    outcome: 'Shipped on time. Board extended runway. Product now has 40+ paying customers.',
    service: 'MVP Build',
    duration: '10 weeks',
  },
};

const CASE_ALIASES = {
  'northstar-ledger': 'finflow',
  lumahire: 'stackpilot',
  carepilot: 'loophr',
};

const LEAD_LABELS = {
  name: 'Name',
  company: 'Company',
  role: 'Role',
  problem: 'Problem',
  timeline: 'Timeline',
  budget: 'Budget',
  contact_email: 'Contact Email',
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

function CaseStudyCard({ clientSlug }) {
  const normalizedSlug = CASE_ALIASES[clientSlug] || clientSlug;
  const study = CASE_STUDIES[normalizedSlug];

  if (!study) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="rounded-xl border border-maneuver-border bg-maneuver-card p-6">
          <h2 className="font-serif text-[20px] text-maneuver-text">Case study not found</h2>
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

export default function VisualPanel({ callEndedLead = null }) {
  const room = useRoomContext();
  const [currentVisual, setCurrentVisual] = useState(null);

  useEffect(() => {
    if (callEndedLead) {
      setCurrentVisual({ type: 'call_ended', leadData: callEndedLead });
    }
  }, [callEndedLead]);

  useEffect(() => {
    if (!room?.localParticipant) {
      return undefined;
    }

    const handler = async (data) => {
      const payload = JSON.parse(data.payload || '{}');
      setCurrentVisual(payload);
      return JSON.stringify({ success: true });
    };

    room.localParticipant.registerRpcMethod('show_visual', handler);
    return () => {
      room.localParticipant.unregisterRpcMethod?.('show_visual');
    };
  }, [room]);

  return (
    <div className="h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={visualKey(currentVisual)}
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
  );
}
