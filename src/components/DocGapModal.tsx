import React from 'react';
import { X, AlertCircle, PlusCircle, Trash2, CheckCircle2, Clock, FileSpreadsheet } from 'lucide-react';
import { DocGapReport } from '../types';

interface DocGapModalProps {
  isOpen: boolean;
  onClose: () => void;
  gaps: DocGapReport[];
  onClearGaps: () => void;
  onDraftDocForGap: (query: string) => void;
}

export const DocGapModal: React.FC<DocGapModalProps> = ({
  isOpen,
  onClose,
  gaps,
  onClearGaps,
  onDraftDocForGap,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Documentation Gap Tracker</h2>
              <p className="text-xs text-slate-500">
                Queries where information was not found in company documentation ({gaps.length} logged)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {gaps.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No documentation gaps reported</p>
              <p className="text-slate-400 mt-1">
                Any query that cannot be answered from company docs will appear here for review.
              </p>
            </div>
          ) : (
            gaps.map((gap, idx) => (
              <div
                key={gap.id || idx}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(gap.timestamp).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>Searched {gap.searchedDocCount} internal docs</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900">"{gap.query}"</p>
                  {gap.notes && <p className="text-xs text-slate-600 italic">{gap.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onDraftDocForGap(gap.query);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Draft Doc</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          {gaps.length > 0 && (
            <button
              onClick={onClearGaps}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Gap Log</span>
            </button>
          )}
          <div className="ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
