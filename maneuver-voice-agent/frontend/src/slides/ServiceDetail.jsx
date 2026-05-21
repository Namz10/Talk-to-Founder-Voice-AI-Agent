import { motion } from 'framer-motion';

const SERVICE_DATA = {
  'product-discovery': {
    name: 'Product Discovery Sprint',
    description:
      'A focused 2-week engagement that takes you from fuzzy idea to validated opportunity. We run stakeholder interviews, competitor teardowns, user research synthesis, and opportunity mapping - delivering a prioritized problem space and a clear product brief your team can execute against.',
    duration: '2 weeks',
    idealFor: 'Pre-seed to Series A founders',
    priceRange: '$4,500 flat',
    outcomes: [
      'Validated problem statement',
      'Competitive landscape map',
      'User insight synthesis',
      'Product brief & recommended next step',
    ],
  },
  'ux-design': {
    name: 'UX & Interface Design',
    description:
      'Full-cycle design from rough wireframes to production-ready UI. We work in Figma, run usability checks at each stage, and deliver annotated specs your engineers can build from without guesswork.',
    duration: '4-8 weeks',
    idealFor: 'Startups preparing for build or redesign',
    priceRange: '$18k-$40k',
    outcomes: ['Information architecture', 'Wireframe flows', 'High-fidelity UI', 'Dev-ready Figma file'],
  },
  'brand-identity': {
    name: 'Brand Identity System',
    description:
      'Visual identity built for a company that plans to grow. Logo system, type hierarchy, color palette, iconography style, and a brand usage guide your team can actually follow.',
    duration: '3-4 weeks',
    idealFor: 'Pre-launch or rebranding startups',
    priceRange: '$12k-$22k',
    outcomes: ['Logo & lockup variants', 'Color & type system', 'Brand guidelines PDF', 'Asset library'],
  },
  'mvp-build': {
    name: 'MVP Build',
    description:
      'We take your approved designs and build them - React/Next.js frontend, documented API integrations, staging + production environments. We ship working software, not prototypes.',
    duration: '8-12 weeks',
    idealFor: 'Founders with validated designs ready to build',
    priceRange: '$35k-$80k',
    outcomes: ['Production React/Next.js app', 'API integrations', 'Staging + prod deploy', 'Technical handoff docs'],
  },
  'design-system': {
    name: 'Design System Creation',
    description:
      'A living component library that keeps your product consistent as the team scales. Built in Figma and React, with tokens, documentation, and Storybook so every designer and engineer works from the same source of truth.',
    duration: '4-6 weeks',
    idealFor: 'Series A+ teams with 2+ designers or engineers',
    priceRange: '$20k-$35k',
    outcomes: ['Figma component library', 'React component library', 'Design tokens', 'Storybook docs'],
  },
  'growth-optimization': {
    name: 'Growth & Conversion Optimization',
    description:
      'Data-informed audit of your funnel, landing pages, and onboarding flow. We identify the biggest leaks, design fixes, and build an A/B test roadmap you can run without us.',
    duration: 'Ongoing or 6-week sprint',
    idealFor: 'Post-launch products with traffic but weak conversion',
    priceRange: '$8k-$15k / sprint',
    outcomes: ['Funnel audit report', 'Redesigned landing pages', 'A/B test roadmap', 'Retention hook map'],
  },
  'tech-architecture': {
    name: 'Technical Architecture Review',
    description:
      'A senior engineer reviews your current stack, infrastructure, and codebase patterns. Deliverable is a prioritized roadmap of risks and improvements - no sales pitch, just honest assessment.',
    duration: '1 week',
    idealFor: 'Founders before a major scaling push',
    priceRange: '$3,500 flat',
    outcomes: ['Architecture risk report', 'Prioritized improvement roadmap', '1-hour debrief call'],
  },
  retainer: {
    name: 'Ongoing Retainer',
    description:
      'Your embedded design and strategy team, available monthly. Includes weekly sprint planning, async Slack access, monthly strategy session, and a dedicated project manager. We become part of your team without the overhead of full-time hires.',
    duration: 'Monthly, min 3 months',
    idealFor: 'Funded startups scaling their product team',
    priceRange: '$8k-$20k / month',
    outcomes: ['Dedicated design capacity', 'Weekly sprint delivery', 'Slack async access', 'Monthly strategy session'],
  },
};

const SERVICE_ALIASES = {
  'ux-interface-design': 'ux-design',
  'brand-identity-system': 'brand-identity',
  'design-system-creation': 'design-system',
  'growth-conversion-optimization': 'growth-optimization',
  'technical-architecture-review': 'tech-architecture',
  'ongoing-retainer': 'retainer',
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
