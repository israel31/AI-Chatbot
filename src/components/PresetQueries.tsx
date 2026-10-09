
import React from 'react';
import { SAMPLE_QUERIES } from '../data/defaultDocs';
import { Sparkles, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

interface PresetQueriesProps {
  onSelectQuery: (query: string) => void;
  disabled?: boolean;
}

export const PresetQueries: React.FC<PresetQueriesProps> = ({
  onSelectQuery,
  disabled
}) => {
  const verifiedQueries = SAMPLE_QUERIES.filter(q => q.shouldBeFound);
  const outOfScopeQueries = SAMPLE_QUERIES.filter(q => !q.shouldBeFound);

  return (
    <div className="px-3 sm:px-8 py-2 sm:py-3 shrink-0 pb-1">
      <div className="max-w-4xl mx-auto space-y-2 bg-white border border-slate-200 shadow-sm rounded-xl p-2.5 sm:p-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Quick Questions
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {[...verifiedQueries, ...outOfScopeQueries]
            .slice(0, 5)
            .map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelectQuery(item.query)}
                disabled={disabled}
                className="text-[10px] sm:text-[11px] bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 hover:text-[#2563eb] border border-slate-200 rounded-md px-2 py-1.5 text-left transition-all flex items-center gap-1 group disabled:opacity-50 max-w-full"
              >
                <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">
                  {item.label}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-[#2563eb] shrink-0" />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};