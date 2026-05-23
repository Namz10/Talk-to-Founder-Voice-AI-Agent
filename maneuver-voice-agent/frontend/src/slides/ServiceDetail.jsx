import { motion } from 'framer-motion';

const SERVICE_DATA = {
  'ai-readiness': {
    name: 'AI Readiness Sprint',
    description:
      'A focused 2-week diagnostic that turns "we should do something with AI" into a costed, prioritized roadmap. We analyze your workflows, find friction points, and map out exactly where AI can drive the highest return on investment.',
    duration: '2 weeks',
    idealFor: 'Companies exploring AI but unsure where to start',
    priceRange: 'Flat fee engagement',
    outcomes: [
      'Prioritized AI roadmap',
      'Cost & ROI estimates',
      'Workflow friction analysis',
      'Implementation-ready specs',
    ],
  },
  'agentic-ai': {
    name: 'Agentic AI',
    description:
      'Workflow agents that take real work off your team\'s plate — deployed in 4–6 weeks. We build custom agents that handle complex, multi-step tasks like order processing, carrier matching, dispatch, tracking, and exception handling.',
    duration: '4-6 weeks',
    idealFor: 'Founders looking to automate heavy back-office operations',
    priceRange: 'Scoped after diagnostic',
    outcomes: [
      'Custom workflow agents',
      'Seamless API integrations',
      'Exception dashboards',
      'Performance logs & metrics',
    ],
  },
  'voice-ai': {
    name: 'Voice AI Concierge',
    description:
      'Arabic + English voice and text agents handling up to 80% of customer inquiries automatically across phone, WhatsApp, and messaging channels with 24/7 availability and zero latency.',
    duration: '4-8 weeks',
    idealFor: 'Businesses with high volume customer inquiries',
    priceRange: 'Scoped after diagnostic',
    outcomes: [
      'Bilingual (AR/EN) Voice Agent',
      'Multi-channel (Phone/WhatsApp)',
      'CRM & booking system sync',
      'Real-time logs & analytics',
    ],
  },
  'fractional-cto': {
    name: 'Fractional CTO',
    description:
      'Ownership of your tech strategy, vendor decisions, and AI roadmap without a full-time hire. Weekly syncs, async Slack/Teams access, and hands-on guidance to guide your team and ensure tech aligns with business growth.',
    duration: 'Monthly, min 3 months',
    idealFor: '10-200 person companies without a full-time CTO',
    priceRange: 'Monthly retainer',
    outcomes: [
      'Tech strategy & architecture',
      'Vendor & tooling selection',
      'Weekly executive syncs',
      'Async Slack/Teams support',
    ],
  },
};

const SERVICE_ALIASES = {
  // Map old service IDs to new ones for seamless compatibility
  'product-discovery': 'ai-readiness',
  'ux-design': 'agentic-ai',
  'ux-interface-design': 'agentic-ai',
  'brand-identity': 'ai-readiness',
  'brand-identity-system': 'ai-readiness',
  'mvp-build': 'agentic-ai',
  'design-system': 'agentic-ai',
  'design-system-creation': 'agentic-ai',
  'growth-optimization': 'agentic-ai',
  'growth-conversion-optimization': 'agentic-ai',
  'tech-architecture': 'fractional-cto',
  'technical-architecture-review': 'fractional-cto',
  'retainer': 'fractional-cto',
  'ongoing-retainer': 'fractional-cto',
  
  // Voice variations
  'voice-ai-concierge': 'voice-ai',
  'voice-concierge': 'voice-ai',
};

export default function ServiceDetail({ service }) {
  const normalizedService = SERVICE_ALIASES[service] || service;
  const detail = SERVICE_DATA[normalizedService];

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="rounded-xl border border-maneuver-border bg-maneuver-card p-6">
          <h2 className="font-serif text-[24px] text-maneuver-text">Service not found</h2>
          <p className="mt-2 text-[13px] leading-6 text-maneuver-muted">
            Ask Alex about another Maneuver service.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.article
      className="flex h-full flex-col"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h2 className="font-serif text-[24px] leading-tight text-maneuver-text">{detail.name}</h2>
      <p className="mt-4 text-[13px] leading-[1.7] text-maneuver-muted">{detail.description}</p>

      <div className="mt-6 grid rounded-lg bg-[#1E1E24] px-4 py-3 md:grid-cols-3">
        {[
          ['Duration', detail.duration],
          ['Ideal for', detail.idealFor],
          ['Price', detail.priceRange],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`py-2 md:px-4 ${index > 0 ? 'border-t border-maneuver-border md:border-l md:border-t-0' : ''}`}
          >
            <div className="text-[10px] uppercase tracking-wide text-maneuver-muted">{label}</div>
            <div className="mt-1 text-[13px] font-semibold leading-5 text-maneuver-text">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-maneuver-muted">
          What you get
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {detail.outcomes.map((outcome, index) => (
            <motion.div
              key={outcome}
              className="flex items-center gap-3 rounded-lg border border-maneuver-border bg-maneuver-card px-3 py-1.5 text-[12px] leading-5 text-maneuver-text"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: index * 0.05 }}
            >
              <span className="h-1 w-1 shrink-0 rounded-full bg-maneuver-accent" />
              {outcome}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}
