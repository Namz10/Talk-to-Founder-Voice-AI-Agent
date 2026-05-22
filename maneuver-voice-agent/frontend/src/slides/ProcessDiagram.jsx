import { motion } from 'framer-motion';

const STEPS = [
  {
    number: '01',
    name: 'Intake Call',
    description: '30-min conversation to understand your goals, constraints, and fit.',
    duration: 'Day 1',
  },
  {
    number: '02',
    name: 'Proposal & Scope',
    description: 'Tailored proposal with timeline, deliverables, and fixed pricing.',
    duration: 'Days 2-5',
  },
  {
    number: '03',
    name: 'Kickoff & Discovery',
    description: 'Deep dive into your users, market, and existing product.',
    duration: 'Week 1-2',
  },
  {
    number: '04',
    name: 'Execution Sprints',
    description: 'Weekly sprints with async updates and live review sessions.',
    duration: 'Weeks 3-N',
  },
  {
    number: '05',
    name: 'Handoff & Support',
    description: 'Full documentation, code transfer, and 30-day support window.',
    duration: 'Final week',
  },
];

export default function ProcessDiagram({ activeStep = null }) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-6 font-serif text-[20px] leading-none text-maneuver-text">How we work</h2>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {STEPS.map((step, index) => (
          <div key={step.number}>
            <motion.div
              className="grid grid-cols-[32px_1fr_auto] items-start gap-4"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.08 }}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[11px] ${
                  activeStep === index + 1
                    ? 'border-maneuver-accent text-maneuver-accent'
                    : 'border-maneuver-border text-maneuver-muted'
                }`}
              >
                {step.number}
              </div>
              <div className="min-w-0 pb-1">
                <h3
                  className={`text-[13px] font-semibold leading-5 ${
                    activeStep === index + 1 ? 'text-maneuver-text' : 'text-maneuver-muted'
                  }`}
                >
                  {step.name}
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-maneuver-muted">{step.description}</p>
              </div>
              <span className="rounded-full border border-maneuver-border px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-maneuver-muted">
                {step.duration}
              </span>
            </motion.div>

            {index < STEPS.length - 1 && (
              <motion.div
                className="ml-4 h-5 w-px origin-top bg-maneuver-border"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.15, delay: index * 0.08 + 0.2 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
