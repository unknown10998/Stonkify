import { useEffect, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTourStore, TOUR_STEPS } from '../store/tourStore';

const DIALOG_W = 460;
const DIALOG_H = 500;
const GAP       = 20;
const EDGE      = 12;
const PAD       = 10; // padding around highlighted element

interface Panels {
  top:    CSSProperties;
  bottom: CSSProperties;
  left:   CSSProperties;
  right:  CSSProperties;
}

function buildPanels(el: HTMLElement): Panels {
  const r  = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const t  = Math.max(0, r.top    - PAD);
  const b  = Math.min(vh, r.bottom + PAD);
  const l  = Math.max(0, r.left   - PAD);
  const ri = Math.min(vw, r.right  + PAD);

  return {
    top:    { position: 'fixed', top: 0,  left: 0,  width: vw,     height: t,       background: 'rgba(0,0,0,0.78)' },
    bottom: { position: 'fixed', top: b,  left: 0,  width: vw,     height: vh - b,  background: 'rgba(0,0,0,0.78)' },
    left:   { position: 'fixed', top: t,  left: 0,  width: l,      height: b - t,   background: 'rgba(0,0,0,0.78)' },
    right:  { position: 'fixed', top: t,  left: ri, width: vw - ri,height: b - t,   background: 'rgba(0,0,0,0.78)' },
  };
}

function calcDialogPos(el: HTMLElement | null): CSSProperties {
  if (!el) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: DIALOG_W };
  }
  const r  = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const idealTop = Math.max(EDGE, Math.min(r.top + r.height / 2 - DIALOG_H / 2, vh - DIALOG_H - EDGE));

  // Right of element
  if (vw - r.right >= DIALOG_W + GAP) {
    return { position: 'fixed', left: r.right + GAP, top: idealTop, width: DIALOG_W };
  }
  // Left of element
  if (r.left >= DIALOG_W + GAP) {
    return { position: 'fixed', right: vw - r.left + GAP, top: idealTop, width: DIALOG_W };
  }
  // Below element
  const idealLeft = Math.max(EDGE, Math.min(r.left + r.width / 2 - DIALOG_W / 2, vw - DIALOG_W - EDGE));
  if (vh - r.bottom >= DIALOG_H + GAP) {
    return { position: 'fixed', top: r.bottom + GAP, left: idealLeft, width: DIALOG_W };
  }
  // Fallback center
  return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: DIALOG_W };
}

export default function OnboardingTour() {
  const { isActive, step, nextStep, prevStep, endTour } = useTourStore();
  const current = TOUR_STEPS[step];

  const [panels,     setPanels]     = useState<Panels | null>(null);
  const [dialogStyle, setDialogStyle] = useState<CSSProperties>({});
  const [highlight,   setHighlight]   = useState<CSSProperties | null>(null);

  // Recalculate panels + dialog position on each step
  useEffect(() => {
    if (!isActive || !current) return;

    const el = current.target
      ? (document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null)
      : null;

    if (el) {
      setPanels(buildPanels(el));
      setDialogStyle(calcDialogPos(el));
      const r = el.getBoundingClientRect();
      setHighlight({
        position: 'fixed',
        top:    r.top    - PAD,
        left:   r.left   - PAD,
        width:  r.width  + PAD * 2,
        height: r.height + PAD * 2,
        borderRadius: 14,
        border: '2.5px solid #fbbf24',
        boxShadow: '0 0 20px 4px rgba(251,191,36,0.25)',
        pointerEvents: 'none',
      });
    } else {
      setPanels(null);
      setHighlight(null);
      setDialogStyle({ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: DIALOG_W });
    }
  }, [isActive, step, current]);

  if (!isActive || !current) return null;

  const progress = ((step + 1) / TOUR_STEPS.length) * 100;
  const OV = 'rgba(0,0,0,0.78)';

  return (
    <>
      {/* Overlay — either 4 panels (target) or full screen (no target) */}
      {panels ? (
        <>
          <div style={{ ...panels.top,    zIndex: 55, pointerEvents: 'auto' }} />
          <div style={{ ...panels.bottom, zIndex: 55, pointerEvents: 'auto' }} />
          <div style={{ ...panels.left,   zIndex: 55, pointerEvents: 'auto' }} />
          <div style={{ ...panels.right,  zIndex: 55, pointerEvents: 'auto' }} />
        </>
      ) : (
        <div
          style={{ position: 'fixed', inset: 0, background: OV, zIndex: 55, backdropFilter: 'blur(2px)' }}
          onClick={endTour}
        />
      )}

      {/* Yellow highlight ring (pointer-events: none so it doesn't block the element) */}
      {highlight && <div style={{ ...highlight, zIndex: 56 }} />}

      {/* Dialog */}
      <div
        className="bg-gray-900 border border-gray-600 rounded-2xl p-7 shadow-2xl"
        style={{ ...dialogStyle, zIndex: 60 }}
      >
        {/* Close */}
        <button onClick={endTour} className="absolute top-4 right-4 text-gray-600 hover:text-gray-300">
          <X size={18} />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-gray-800 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Step label */}
        <div className="text-gray-500 text-xs uppercase tracking-widest mb-3">
          Step {step + 1} of {TOUR_STEPS.length}
        </div>

        <h2 className="text-xl font-black text-white mb-4 leading-tight">{current.title}</h2>

        {/* Body */}
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line mb-6">
          {current.body}
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-yellow-400' : i < step ? 'w-1.5 bg-yellow-700' : 'w-1.5 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Interactive hint */}
        {current.target && (
          <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-3 py-2 mb-4 text-yellow-400/90 text-xs">
            <span className="text-base leading-none">↑</span>
            <span>This area is live — interact with it freely, then click Next when ready.</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <button
            onClick={nextStep}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-black transition-colors"
          >
            {step === TOUR_STEPS.length - 1 ? "Let's Trade!" : 'Next'}
            {step < TOUR_STEPS.length - 1 && <ChevronRight size={14} />}
          </button>
        </div>

        <button onClick={endTour} className="w-full mt-2 text-gray-600 hover:text-gray-400 text-xs py-1">
          Skip tour
        </button>
      </div>
    </>
  );
}
