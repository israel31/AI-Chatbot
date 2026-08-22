import React from 'react';
import { SAMPLE_QUERIES } from '../data/defaultDocs';
import { Sparkles, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

interface PresetQueriesProps {
  onSelectQuery: (query: string) => void;
  disabled?: boolean;
}

export const PresetQueries: React.FC<PresetQueriesProps> = ({ onSelectQuery, disabled }) => {
  const verifiedQueries = SAMPLE_QUERIES.filter(q => q.shouldBeFound);
  const outOfScopeQueries = SAMPLE_QUERIES.filter(q => !q.shouldBeFound);

  return (
    <div className="bg-white/80 border-t border-slate-200/80 px-4 sm:px-8 py-3 shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
            Quick Benchmark Prompts
          </span>
          <span className="text-[10px] text-slate-400">
            Click to test exact internal policy retrieval vs air-gapped refusal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Grounded in Docs Prompts */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              <CheckCircle className="w-3 h-3" />
              <span>Grounded in Internal Policies:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {verifiedQueries.slice(0, 3).map((item, idx) => (
                <button
                  key={idx}
                  id={`preset-grounded-${idx}`}
                  onClick={() => onSelectQuery(item.query)}
                  disabled={disabled}
                  className="text-[11px] bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md px-2 py-1 text-left transition-all flex items-center gap-1 group disabled:opacity-50"
                >
                  <span className="font-medium truncate max-w-[210px]">{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-[#2563eb] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Out of Scope Refusal Prompts */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              <span>Negative Test (Air-Gapped Refusal):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {outOfScopeQueries.slice(0, 2).map((item, idx) => (
                <button
                  key={idx}
                  id={`preset-refusal-${idx}`}
                  onClick={() => onSelectQuery(item.query)}
                  disabled={disabled}
                  className="text-[11px] bg-slate-50 hover:bg-rose-50/50 hover:border-rose-200 text-slate-700 hover:text-rose-900 border border-slate-200 rounded-md px-2 py-1 text-left transition-all flex items-center gap-1 group disabled:opacity-50"
                >
                  <span className="font-medium truncate max-w-[210px]">{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-rose-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
