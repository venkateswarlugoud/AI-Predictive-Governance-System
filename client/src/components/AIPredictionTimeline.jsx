import React from "react";

const AIPredictionTimeline = ({ history, finalCategory, finalPriority }) => {
  const safeHistory = Array.isArray(history) ? [...history] : [];

  if (!safeHistory.length) {
    return null;
  }

  safeHistory.sort((a, b) => {
    const aTime = a?.predictedAt ? new Date(a.predictedAt).getTime() : 0;
    const bTime = b?.predictedAt ? new Date(b.predictedAt).getTime() : 0;
    return aTime - bTime;
  });

  const latestIndex = safeHistory.length - 1;

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-700">AI Prediction History</h4>
      <div className="relative pl-4">
        <div className="absolute inset-y-1 left-1 w-px bg-slate-200" aria-hidden="true" />
        <div className="space-y-3">
          {safeHistory.map((entry, index) => {
            const isLatest = index === latestIndex;
            const isDifferentFromFinal =
              !!(
                (finalCategory && entry?.category && entry.category !== finalCategory) ||
                (finalPriority && entry?.priority && entry.priority !== finalPriority)
              );

            return (
              <div key={index} className="relative flex items-start gap-3">
                <div
                  className={`mt-2 h-3 w-3 rounded-full border ${
                    isLatest
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-slate-300 bg-slate-100"
                  }`}
                />
                <div
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                    isLatest
                      ? "border-indigo-200 bg-indigo-50 text-slate-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-800">
                      Model {entry?.modelVersion || "N/A"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(entry?.predictedAt)}
                    </div>
                  </div>
                  <div className="grid gap-1 text-xs md:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Category</span>
                      <span className="font-medium text-slate-800">
                        {entry?.category || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Priority</span>
                      <span className="font-medium text-slate-800">
                        {entry?.priority || "N/A"}
                      </span>
                    </div>
                    {entry?.categoryConfidence != null && (
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Category Confidence</span>
                        <span className="font-medium text-slate-800">
                          {entry.categoryConfidence}
                        </span>
                      </div>
                    )}
                    {entry?.priorityConfidence != null && (
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Priority Confidence</span>
                        <span className="font-medium text-slate-800">
                          {entry.priorityConfidence}
                        </span>
                      </div>
                    )}
                  </div>
                  {isDifferentFromFinal && (
                    <div className="mt-2 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 border border-amber-200">
                      Different from Final Decision
                    </div>
                  )}
                  {isLatest && (
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-indigo-600">
                      Latest Prediction
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AIPredictionTimeline;

