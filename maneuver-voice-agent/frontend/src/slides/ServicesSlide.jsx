import { motion } from 'framer-motion';

const SERVICES = [
  {
    slug: 'ai-readiness',
    name: 'AI Readiness Sprint',
    description:
      '2-week diagnostic that turns "we should do something with AI" into a costed, prioritized roadmap.',
    duration: '2 weeks',
    tag: 'Strategy',
    tagColor: 'teal',
  },
  {
    slug: 'agentic-ai',
    name: 'Agentic AI',
    description: 'Workflow agents that take real work off your team — order processing, dispatch, tracking, exception handling.',
    duration: '4-6 weeks',
    tag: 'AI',
    tagColor: 'coral',
  },
  {
    slug: 'voice-ai',
    name: 'Voice AI Concierge',
    description: 'Arabic + English voice agents handling up to 80% of customer inquiries automatically across phone and messaging.',
    duration: '4-8 weeks',
    tag: 'AI',
    tagColor: 'teal',
  },
  {
    slug: 'fractional-cto',
    name: 'Fractional CTO',
    description: 'Ownership of your tech strategy, vendor decisions, and AI roadmap without a full-time hire.',
    duration: 'Monthly',
    tag: 'Advisory',
    tagColor: 'coral',
  },
];

function tagClasses(tagColor) {
  if (tagColor === 'teal') {
    return 'border-[#1D6B5A] bg-[#0F3D35] text-[#3BBFA0]';
  }

  return 'border-[#6B2A1D] bg-[#3D1710] text-maneuver-accent';
}

export default function ServicesSlide() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="font-serif text-[22px] leading-none text-maneuver-text">What we do</h2>
        <p className="text-[13px] text-maneuver-muted">4 core services</p>
      </div>

      <motion.div
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {SERVICES.map((service, index) => (
          <motion.article
            key={service.slug}
            className="group relative rounded-xl border border-maneuver-border bg-maneuver-card px-[14px] py-3 transition-colors duration-150 hover:border-maneuver-accent"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-[13px] font-semibold leading-5 text-maneuver-text">{service.name}</h3>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4 ${tagClasses(
                  service.tagColor,
                )}`}
              >
                {service.tag}
              </span>
            </div>
            <p className="mb-3 line-clamp-2 text-[12px] leading-5 text-maneuver-muted">
              {service.description}
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wide text-maneuver-muted">
              {service.duration}
            </span>
            <span className="absolute bottom-3 right-[14px] text-[10px] text-maneuver-muted opacity-0 transition-opacity duration-150 group-hover:opacity-60">
              &rarr; Ask about this
            </span>
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}
