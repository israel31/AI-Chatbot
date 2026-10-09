
import React from 'react';
import { PlusCircle, AlertCircle, CheckCircle2, Menu, Trash2 } from 'lucide-react';

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
  isAdmin: boolean;
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
  isAdmin,
}) => {
  return (
    <header className="h-14 sm:h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between gap-2 px-3 sm:px-8 sticky top-0 z-30 shrink-0 shadow-2xs">
      {/* Logo and brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileSidebar && isAdmin && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title="Toggle Knowledge Base Sidebar"
            aria-label="Open knowledge base sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 bg-slate-900 flex items-center justify-center shrink-0">
            <img
              src="/chimobi_logo.jpg"
              alt="JCIN UNIBEN Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <span className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900 whitespace-nowrap">
            JCIN UNIBEN
          </span>
        </div>
      </div>

      {/* Header actions */}
      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
        {isAdmin && (
          <>
            <button
              id="toggle-strictness-mode"
              onClick={onToggleStrictMode}
              className={`hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-colors border ${strictMode
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              title="Toggle strict air-gapped grounding refusal"
            >
              <CheckCircle2
                className={`w-3.5 h-3.5 ${strictMode ? 'text-emerald-400' : 'text-slate-400'
                  }`}
              />
              <span>Strict:</span>
              <span>{strictMode ? 'Enforced' : 'Standard'}</span>
            </button>

            {gapCount > 0 && (
              <button
                id="header-gaps-btn"
                onClick={onOpenGapLog}
                className="hidden sm:flex text-xs text-slate-500 hover:text-slate-800 cursor-pointer items-center gap-1 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Doc Gaps ({gapCount})</span>
              </button>
            )}

            <button
              id="add-doc-quick-btn"
              onClick={onOpenAddDoc}
              className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-medium transition-colors shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Policy</span>
            </button>
          </>
        )}

        {hasMessages && (
          <button
            id="clear-session-header-btn"
            onClick={onClearSession}
            className="inline-flex items-center justify-center gap-1 text-xs sm:text-[13px] text-slate-500 hover:text-rose-600 font-medium cursor-pointer transition-colors p-2 sm:px-2 sm:py-1 rounded-md hover:bg-slate-100"
            title="Clear Chat History"
            aria-label="Clear chat history"
          >
            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </div>
    </header>
  );
};