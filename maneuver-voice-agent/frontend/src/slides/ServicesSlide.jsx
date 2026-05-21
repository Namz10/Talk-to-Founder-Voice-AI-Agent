import { motion } from 'framer-motion';

const SERVICES = [
  {
    slug: 'product-discovery',
    name: 'Product Discovery Sprint',
    description:
      'Rapid validation of your idea through user research, competitive mapping, and opportunity framing.',
    duration: '2 weeks',
    tag: 'Strategy',
    tagColor: 'teal',
  },
  {
    slug: 'ux-design',
    name: 'UX & Interface Design',
    description: 'End-to-end design from wireframes to high-fidelity, production-ready UI.',
    duration: '4-8 weeks',
    tag: 'Design',
    tagColor: 'coral',
  },
  {
    slug: 'brand-identity',
    name: 'Brand Identity System',
    description: 'Visual identity, logo, typography, color, and usage guidelines built for scale.',
    duration: '3-4 weeks',
    tag: 'Brand',
    tagColor: 'teal',
  },
  {
    slug: 'mvp-build',
    name: 'MVP Build',
    description: 'Full-stack React/Next.js build from approved designs, production-ready and documented.',
    duration: '8-12 weeks',
    tag: 'Engineering',
    tagColor: 'coral',
  },
  {
    slug: 'design-system',
    name: 'Design System Creation',
    description: 'Component library, tokens, documentation, and Storybook for consistent product teams.',
    duration: '4-6 weeks',
    tag: 'Design',
    tagColor: 'teal',
  },
  {
    slug: 'growth-optimization',
    name: 'Growth & Conversion',
    description: 'Funnel analysis, A/B test roadmap, landing page redesign, and retention hooks.',
    duration: 'Ongoing',
    tag: 'Growth',
    tagColor: 'coral',
  },
  {
    slug: 'tech-architecture',
    name: 'Technical Architecture Review',
    description: 'Audit of your current stack with a prioritized improvement roadmap.',
    duration: '1 week',
    tag: 'Engineering',
    tagColor: 'teal',
  },
  {
    slug: 'retainer',
    name: 'Ongoing Retainer',
    description: 'Embedded design and strategy team. Monthly sprints, Slack access, weekly syncs.',
    duration: 'Monthly',
    tag: 'Retainer',
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
        <p className="text-[13px] text-maneuver-muted">8 core services</p>
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
            className="rounded-xl border border-maneuver-border bg-maneuver-card px-[14px] py-3 transition-colors duration-150 hover:border-maneuver-accent"
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
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}
