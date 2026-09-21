import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  PlusCircle,
  Quote,
  Lock,
  Info
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatMessageItemProps {
  message: ChatMessage;
  onViewDoc: (docId: string, highlightQuote?: string) => void;
  onOpenAddDocWithGap?: (query: string) => void;
  onReportGap?: (query: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onViewDoc,
  onOpenAddDocWithGap,
  onReportGap,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAllCitations, setShowAllCitations] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex gap-3 max-w-[85%] self-end flex-row-reverse my-2">
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-700 text-white shrink-0 flex items-center justify-center text-xs font-bold shadow-2xs">
          JD
        </div>
        {/* User Bubble */}
        <div className="flex flex-col items-end">
          <div className="bg-[#2563eb] text-white rounded-2xl rounded-tr-xs px-4 py-3 text-[14px] leading-relaxed shadow-2xs">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  const isGrounded = message.status === 'grounded' && (message.citations?.length ?? 0) > 0;
  const isNotFound = message.status === 'not_found' || (!isGrounded && message.status !== 'error');

  return (
    <div className="flex gap-3 max-w-[88%] my-2 items-start">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-xl overflow-hidden shadow-2xs border border-slate-200/80 bg-slate-900 flex items-center justify-center shrink-0">
        <img
          src="/chimobi_logo.jpg"
          alt="Chimobi Logo"
          className="w-full h-full object-cover"
        />
      </div>

      {/* AI Bubble & Metadata */}
      <div className="flex-1 min-w-0">
        <div
          className={`p-4 sm:p-5 rounded-2xl bg-white border text-[14.5px] leading-relaxed shadow-xs transition-all ${
            isNotFound
              ? 'border-slate-200 border-l-4 border-l-rose-500 bg-rose-50/20'
              : message.status === 'error'
              ? 'border-slate-200 border-l-4 border-l-amber-500 bg-amber-50/20'
              : 'border-slate-200'
          }`}
        >
          {/* Answer Content */}
          <div className="prose prose-sm prose-slate max-w-none text-slate-800 leading-relaxed break-words font-normal">
            <Markdown>{message.content}</Markdown>
          </div>

          {/* Copy Button Row (Citations and Sources removed per request) */}
          {isGrounded && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  id={`copy-btn-${message.id}`}
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Missing Doc Actions for Refusals */}
          {isNotFound && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
              {onOpenAddDocWithGap && (
                <button
                  onClick={() => onOpenAddDocWithGap(message.content)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2563eb] text-white text-[11px] font-medium hover:bg-[#1d4ed8] transition-colors shadow-2xs"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Draft Policy for this Gap</span>
                </button>
              )}
              {onReportGap && (
                <button
                  onClick={() => onReportGap(message.content)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors border border-slate-200"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Track Missing Doc</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
