import React, { useEffect, useState, useRef } from "react";

interface ProgressiveLoaderProps {
  steps: string[];
  active: boolean;
  onComplete?: () => void;
  durationsMs?: number[];
  compact?: boolean;
  message?: string;
}

const defaultDurations = [800, 30000, 40000, 20000, 2000];

const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  steps,
  active,
  onComplete,
  durationsMs,
  compact = false,
  message,
}) => {
  const [statuses, setStatuses] = useState(steps.map(() => "pending") as ("pending" | "active" | "done")[]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setStatuses(steps.map(() => "done"));
      const tm = window.setTimeout(() => onComplete?.(), 300);
      timersRef.current.push(tm);
      return;
    }

    setStatuses(steps.map(() => "pending"));

    const durations = (() => {
      const base = durationsMs ?? defaultDurations;
      return steps.map((_, i) => base[i] ?? base[base.length - 1]);
    })();

    let tAccum = 0;
    setStatuses((s) => s.map((_, idx) => (idx === 0 ? "active" : "pending")));

    for (let i = 0; i < steps.length; i++) {
      tAccum += durations[i];
      const idx = i;

      const tm = window.setTimeout(() => {
        setStatuses((prev) => {
          const next = [...prev];
          next[idx] = "done";
          if (idx + 1 < next.length) next[idx + 1] = "active";
          return next;
        });

        if (idx === steps.length - 1) onComplete?.();
      }, tAccum);

      timersRef.current.push(tm);
    }

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [active, JSON.stringify(steps), onComplete, durationsMs]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-700">
        {steps.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            {statuses[idx] === "done" ? (
              <span className="text-green-600 font-semibold">✓</span>
            ) : statuses[idx] === "active" ? (
              <span className="inline-block w-3 h-3 border-2 border-black rounded-full animate-pulse" />
            ) : (
              <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full opacity-60" />
            )}

            <span className={statuses[idx] === "done" ? "text-gray-500" : "text-black"}>
              {label}
              {statuses[idx] === "active" ? "..." : ""}
            </span>

            {idx < steps.length - 1 && <span className="text-gray-400">·</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-10 w-full">
      <div className="flex items-center gap-6 w-full max-w-xl">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 w-full h-full border-4 border-gray-300 rounded-full" />
          <div className="absolute inset-0 w-full h-full border-4 border-black rounded-full border-t-transparent animate-spin" />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">Working on your analysis</h3>
          <p className="text-sm text-gray-600">This might take a minute — progress updates show the activity.</p>
          {message && <p className="text-xs text-gray-500 mt-1">{message}</p>}
        </div>
      </div>

      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-md p-6">
        <ul className="space-y-4">
          {steps.map((label, idx) => (
            <li key={idx}>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {statuses[idx] === "done" ? (
                    <span className="text-green-600 font-bold text-lg">✓</span>
                  ) : statuses[idx] === "active" ? (
                    <div className="w-4 h-4 border-2 border-black rounded-full animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  )}
                </div>

                <div className="flex flex-col">
                  <span className={`text-sm ${statuses[idx] === 'done' ? 'text-gray-600' : 'text-gray-900'}`}>
                    {label}
                    {statuses[idx] === 'active' ? '...' : ''}
                  </span>

                  {statuses[idx] === 'active' && (
                    <span className="text-xs text-gray-500 mt-1">Processing — please wait</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProgressiveLoader;
