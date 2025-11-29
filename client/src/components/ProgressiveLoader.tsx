import React, { useEffect, useState, useRef } from 'react';

interface ProgressiveLoaderProps {
  steps: string[];
  active: boolean; // when true start animating, when false mark all completed
  onComplete?: () => void;
  durationsMs?: number[]; // optional per-step durations
  compact?: boolean; // render smaller inline layout
  message?: string; // optional short message line to show below title
}

const defaultDurations = [800, 30000, 40000, 20000, 2000];

const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({ steps, active, onComplete, durationsMs, compact = false, message }) => {
  const [statuses, setStatuses] = useState<('pending' | 'active' | 'done')[]>(
    steps.map(() => 'pending')
  );

  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    // clear timers on unmount
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    // when active becomes true start the progressive automation
    if (!active) {
      // mark everything done if not active
      setStatuses(steps.map(() => 'done'));
      // call onComplete once finished UI is settled
      const tm = window.setTimeout(() => onComplete?.(), 300);
      timersRef.current.push(tm);
      return;
    }

    // reset statuses
    setStatuses(steps.map(() => 'pending'));

    // durations array --- fallback to default but expand/shrink as necessary
    const durations = (() => {
      const base = durationsMs ?? defaultDurations;
      // create an array matching steps length repeating last value
      const arr = steps.map((_, i) => base[i] ?? base[base.length - 1]);
      // ensure sum isn't ridiculously short for long flows; caller can customize
      return arr;
    })();

    // step through
    let tAccum = 0;
    // mark first step active immediately
    setStatuses((s) => s.map((_, idx: number) => (idx === 0 ? 'active' : 'pending')));

    for (let i = 0; i < steps.length; i++) {
      // schedule completion of step i after durations[i]
      tAccum += durations[i];
      const idx = i;
      const tm = window.setTimeout(() => {
        setStatuses((prev) => {
          const next: ('pending' | 'active' | 'done')[] = [...prev];
          next[idx] = 'done';
          if (idx + 1 < next.length) next[idx + 1] = 'active';
          return next;
        });

        // if this was last step, call onComplete after a short pause
        if (idx === steps.length - 1) {
          onComplete?.();
        }
      }, tAccum);

      timersRef.current.push(tm);
    }

    // cleanup scheduled timers if active toggles off or component unmounts
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [active, JSON.stringify(steps), onComplete, durationsMs]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-200">
        {steps.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            {statuses[idx] === 'done' ? (
              <span className="text-green-400 font-semibold">✓</span>
            ) : statuses[idx] === 'active' ? (
              <span className="inline-block w-3 h-3 border-2 border-blue-400 rounded-full animate-pulse" />
            ) : (
              <span className="inline-block w-1.5 h-1.5 bg-gray-500 rounded-full opacity-60" />
            )}
            <span className={`${statuses[idx] === 'done' ? 'text-gray-300' : 'text-white'}`}>
              {label}{statuses[idx] === 'active' ? '...' : ''}
            </span>
            {idx < steps.length - 1 && <span className="text-gray-500">·</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-8 w-full">
      <div className="flex items-center gap-4 w-full max-w-lg">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-1">Working on your analysis</h3>
          <p className="text-sm text-gray-400">This might take up to a couple minutes — progress updates below show activity.</p>
          {message && <p className="text-xs text-gray-400 mt-1">{message}</p>}
        </div>
      </div>

      <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-xl p-4">
        <ul className="space-y-3">
          {steps.map((label, idx) => (
            <li key={label} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full">
                {statuses[idx] === 'done' ? (
                  <span className="text-green-400 font-bold">✓</span>
                ) : statuses[idx] === 'active' ? (
                  <div className="w-6 h-6 border-2 border-blue-400 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-gray-500 rounded-full opacity-60" />
                )}
              </div>
              <div className="flex flex-col">
                <div className={`text-sm ${statuses[idx] === 'done' ? 'text-gray-300' : 'text-white'}`}>
                  {label}{statuses[idx] === 'active' ? '...' : ''}
                </div>
                {statuses[idx] === 'active' && (
                  <div className="text-xs text-gray-400 mt-1">Processing — please wait</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProgressiveLoader;
