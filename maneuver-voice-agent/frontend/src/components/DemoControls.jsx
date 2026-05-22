// DEMO ONLY — remove or disable before production deployment
const VISUAL_BUTTONS = [
  ['Services', { type: 'services' }],
  ['Process', { type: 'process' }],
  ['MVP Detail', { type: 'service_detail', service: 'mvp-build' }],
  ['Discovery', { type: 'service_detail', service: 'product-discovery' }],
  ['Northstar', { type: 'case_study', client: 'northstar-ledger' }],
  ['LumaHire', { type: 'case_study', client: 'lumahire' }],
  ['CarePilot', { type: 'case_study', client: 'carepilot' }],
  ['Reset', null],
  [
    'End Screen',
    {
      type: 'call_ended',
      leadData: {
        name: 'Demo User',
        company: 'Acme Inc',
        role: 'CTO',
        problem: 'Need MVP in 10 weeks',
        timeline: 'Q3 2025',
        budget: '$50k-$80k',
      },
    },
  ],
];

const DEMO_LEADS = [
  ['name', 'Priya Sharma'],
  ['company', 'Buildfast'],
  ['role', 'Co-founder'],
  ['problem', 'Need to go from designs to MVP in 8 weeks'],
  ['timeline', 'Q3 2025'],
  ['budget', '$50k-$80k range'],
  ['contact_email', 'priya@buildfast.example'],
];

export default function DemoControls({ onClose, onSetVisual, onSetLeadField }) {
  function fillLeads() {
    DEMO_LEADS.forEach(([field, value], index) => {
      window.setTimeout(() => onSetLeadField(field, value), index * 300);
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[280px] rounded-xl border border-maneuver-border bg-maneuver-card/95 p-4 text-maneuver-text backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maneuver-muted">
          Demo Controls
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-lg leading-none text-maneuver-muted transition hover:text-maneuver-text"
          aria-label="Close demo controls"
        >
          &times;
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {VISUAL_BUTTONS.map(([label, visual]) => (
          <button
            key={label}
            type="button"
            onClick={() => onSetVisual(visual)}
            className="rounded-md border border-maneuver-border bg-maneuver-bg px-2 py-1.5 text-[12px] text-maneuver-muted transition hover:border-maneuver-accent hover:text-maneuver-text"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={fillLeads}
          className="col-span-2 rounded-md border border-maneuver-border bg-maneuver-bg px-2 py-1.5 text-[12px] text-maneuver-muted transition hover:border-maneuver-teal hover:text-maneuver-text"
        >
          Fill Leads
        </button>
      </div>
    </div>
  );
}
