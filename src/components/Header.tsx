import React from 'react';
import { ShieldCheck, BookOpen, Lock, PlusCircle, AlertCircle, Sparkles, CheckCircle2, RotateCcw, Menu } from 'lucide-react';

interface HeaderProps {
  docCount: number;
  selectedDocCount: number;
  onOpenKnowledgeBase: () => void;
  onOpenAddDoc: () => void;
  onOpenGapLog: () => void;
  gapCount: number;
  strictMode: boolean;
  onToggleStrictMode: () => void;
  onClearSession: () => void;
  hasMessages: boolean;
  onToggleMobileSidebar?: () => void;
  activeContextName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  docCount,
  selectedDocCount,
  onOpenKnowledgeBase,
  onOpenAddDoc,
  onOpenGapLog,
  gapCount,
  strictMode,
  onToggleStrictMode,
  onClearSession,
  hasMessages,
  onToggleMobileSidebar,
  activeContextName,
}) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shrink-0">
      {/* Left: Secure Mode Badge & Context */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Toggle Knowledge Base Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <span className="source-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SECURE MODE
          </span>
          <span className="text-xs sm:text-[13px] text-slate-500 hidden sm:inline truncate max-w-xs md:max-w-md">
            Context: <span className="font-medium text-slate-700">{activeContextName || (selectedDocCount === docCount ? `All ${docCount} Internal Policies` : `${selectedDocCount} Policies Selected`)}</span>
          </span>
        </div>
      </div>

      {/* Right: Clean Action Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Strict Grounding Toggle */}
        <button
          id="toggle-strictness-mode"
          onClick={onToggleStrictMode}
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-colors border ${
            strictMode
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Toggle strict air-gapped grounding refusal"
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${strictMode ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Strict Grounding:</span>
          <span>{strictMode ? 'Enforced' : 'Standard'}</span>
        </button>

        {/* Clear Session */}
        {hasMessages && (
          <button
            id="clear-session-header-btn"
            onClick={onClearSession}
            className="text-xs sm:text-[13px] text-[#2563eb] hover:text-[#1d4ed8] font-medium cursor-pointer transition-colors"
          >
            Clear Session
          </button>
        )}

        {/* Gaps Link */}
        {gapCount > 0 && (
          <button
            id="header-gaps-btn"
            onClick={onOpenGapLog}
            className="text-xs sm:text-[13px] text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Doc Gaps ({gapCount})</span>
          </button>
        )}

        {/* Add Policy / Quick Button for small screens */}
        <button
          id="add-doc-quick-btn"
          onClick={onOpenAddDoc}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-medium transition-colors shadow-2xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Policy</span>
        </button>
      </div>
    </header>
  );
};
