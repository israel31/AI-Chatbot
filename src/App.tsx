/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Loader2,
  BookOpen,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Lock,
  FileText,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldAlert,
  FileQuestion,
  HelpCircle,
  ChevronRight,
  Check,
  X,
  Menu,
  Eye,
  Plus
} from 'lucide-react';
import { DocumentItem, ChatMessage, DocGapReport, QueryResponsePayload } from './types';
import { DEFAULT_COMPANY_DOCUMENTS } from './data/defaultDocs';
import { Header } from './components/Header';
import { ChatMessageItem } from './components/ChatMessageItem';
import { PresetQueries } from './components/PresetQueries';
import { KnowledgeBaseModal } from './components/KnowledgeBaseModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { AddDocumentModal } from './components/AddDocumentModal';
import { DocGapModal } from './components/DocGapModal';

const STORAGE_KEY_DOCS = 'company_docs_kb_v4';
const STORAGE_KEY_GAPS = 'company_docs_gaps_v1';

export default function App() {
  // Knowledge Base state
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOCS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading saved docs:', e);
    }
    return DEFAULT_COMPANY_DOCUMENTS;
  });

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() =>
    documents.map(d => d.id)
  );

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [strictMode, setStrictMode] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | undefined>(undefined);
  const [initialDraftQuery, setInitialDraftQuery] = useState<string | undefined>(undefined);

  // Gaps state
  const [gaps, setGaps] = useState<DocGapReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GAPS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading saved gaps:', e);
    }
    return [];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist docs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(documents));
    } catch (e) {
      console.error('Error saving docs:', e);
    }
  }, [documents]);

  // Persist gaps
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GAPS, JSON.stringify(gaps));
    } catch (e) {
      console.error('Error saving gaps:', e);
    }
  }, [gaps]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle query execution
  const handleSendQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    // Filter documents by selected IDs
    const activeDocs = documents.filter(d => selectedDocIds.includes(d.id));
    if (activeDocs.length === 0) {
      alert('Please select at least one company document in the Knowledge Base scope to query.');
      setIsKbModalOpen(true);
      return;
    }

    const userMessageId = `msg-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      status: 'grounded',
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          documents: activeDocs,
          strictMode: strictMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: QueryResponsePayload = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        status: data.isGrounded ? 'grounded' : 'not_found',
        citations: data.citations || [],
        searchedDocs: data.searchedDocs || activeDocs.map(d => d.title),
        confidenceScore: data.confidence,
        gapAnalysis: data.gapAnalysis,
        filteredDocIds: selectedDocIds,
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If not grounded, auto-log to gaps if not already present
      if (!data.isGrounded) {
        const newGap: DocGapReport = {
          id: `gap-${Date.now()}`,
          query: trimmed,
          timestamp: new Date().toISOString(),
          searchedDocCount: activeDocs.length,
          notes: data.gapAnalysis || 'Information missing in verified company documents',
          status: 'pending',
        };
        setGaps(prev => [newGap, ...prev.slice(0, 49)]);
      }
    } catch (err: any) {
      console.error('Error during query:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `**Error retrieving information:** ${err.message || 'Unable to connect to internal document search service'}.\n\nPlease ensure your query is formulated clearly and retry.`,
        timestamp: new Date().toISOString(),
        status: 'error',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery(inputQuery);
    }
  };

  const handleViewDoc = (docId: string, quote?: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setViewingDoc(doc);
      setHighlightQuote(quote);
    }
  };

  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments(prev => [newDoc, ...prev]);
    setSelectedDocIds(prev => [newDoc.id, ...prev]);
  };

  const handleUpdateDocument = (updatedDoc: DocumentItem) => {
    setDocuments(prev => prev.map(d => (d.id === updatedDoc.id ? updatedDoc : d)));
    if (viewingDoc && viewingDoc.id === updatedDoc.id) {
      setViewingDoc(updatedDoc);
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm('Are you sure you want to remove this document from the knowledge base?')) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setSelectedDocIds(prev => prev.filter(id => id !== docId));
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset knowledge base to default corporate policy documents?')) {
      setDocuments(DEFAULT_COMPANY_DOCUMENTS);
      setSelectedDocIds(DEFAULT_COMPANY_DOCUMENTS.map(d => d.id));
    }
  };

  const handleToggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllDocs = () => {
    setSelectedDocIds(documents.map(d => d.id));
  };

  const handleDeselectAllDocs = () => {
    setSelectedDocIds([]);
  };

  const handleDraftDocFromGap = (query: string) => {
    setInitialDraftQuery(query);
    setIsAddDocModalOpen(true);
  };

  const handleReportGapManual = (query: string) => {
    const newGap: DocGapReport = {
      id: `gap-${Date.now()}`,
      query: query,
      timestamp: new Date().toISOString(),
      searchedDocCount: selectedDocIds.length,
      notes: 'Manually flagged as missing internal documentation',
      status: 'pending',
    };
    setGaps(prev => [newGap, ...prev]);
    alert('Logged query into Documentation Gap Tracker!');
  };

  // Determine active context title for header
  const activeContextName =
    selectedDocIds.length === 1
      ? documents.find(d => d.id === selectedDocIds[0])?.title.split(',')[0]
      : selectedDocIds.length === documents.length
      ? 'All Knowledge Bases'
      : `${selectedDocIds.length} Selected Policies`;

  // Determine if admin view is active
  const isAdmin = new URLSearchParams(window.location.search).get('role') === 'admin';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && isAdmin && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Clean Minimalism Sidebar (Desktop fixed 280px / Mobile drawer) */}
      {isAdmin && (
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-[280px] h-full bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
        {/* Brand / Logo Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="font-extrabold text-[18px] tracking-tight text-slate-900">
              DocuGuard<span className="text-[#2563eb]">.ai</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Knowledge Base Navigation Section */}
        <div className="flex-1 overflow-y-auto py-5 custom-scrollbar">
          <div className="px-6 mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Knowledge Bases
            </span>
            <button
              onClick={() => setIsKbModalOpen(true)}
              className="text-[11px] text-[#2563eb] hover:underline font-medium"
            >
              Manage
            </button>
          </div>

          <div className="space-y-1 px-3">
            {documents.map(doc => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => handleToggleSelectDoc(doc.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-100/90 text-slate-900 font-medium'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                  title={`${doc.title} - Click to include/exclude from query scope`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected ? 'bg-[#2563eb]' : 'bg-slate-300'
                      }`}
                    />
                    <span className="truncate">{doc.title.split(',')[0]}</span>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleViewDoc(doc.id);
                    }}
                    className="p-1 text-slate-400 hover:text-[#2563eb] rounded hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                    title="View policy"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Actions in Sidebar */}
          <div className="px-4 mt-6 pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => {
                setInitialDraftQuery(undefined);
                setIsAddDocModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#2563eb] text-white text-xs font-semibold hover:bg-[#1d4ed8] transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Policy Document</span>
            </button>

            {gaps.length > 0 && (
              <button
                onClick={() => setIsGapModalOpen(true)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs font-medium hover:bg-amber-100/70 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Documentation Gaps</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-950 font-bold text-[10px]">
                  {gaps.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom User Clearance Badge */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white shrink-0 flex items-center justify-center text-xs font-bold shadow-2xs">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-slate-900 truncate">John Doe</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Security Clear: L3 Air-Gapped</span>
              </div>
            </div>
          </div>
        </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-[#f8fafc] overflow-hidden">
        {/* Clean Minimalism Header */}
        <Header
          docCount={documents.length}
          selectedDocCount={selectedDocIds.length}
          onOpenKnowledgeBase={() => setIsKbModalOpen(true)}
          onOpenAddDoc={() => {
            setInitialDraftQuery(undefined);
            setIsAddDocModalOpen(true);
          }}
          onOpenGapLog={() => setIsGapModalOpen(true)}
          gapCount={gaps.length}
          strictMode={strictMode}
          onToggleStrictMode={() => setStrictMode(!strictMode)}
          onClearSession={() => setMessages([])}
          hasMessages={messages.length > 0}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          activeContextName={activeContextName}
          isAdmin={isAdmin}
        />

        {/* Chat Viewport */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-16 py-6 flex flex-col gap-5 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-12">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border border-slate-200/80 bg-slate-900 mb-5 flex items-center justify-center transition-transform hover:scale-105">
                <img
                  src="/chimobi_logo.jpg"
                  alt="Chimobi Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Chimobi
              </h2>
              <p className="text-[15px] text-slate-500 max-w-sm mt-2 leading-relaxed font-medium">
                How can I help you today?
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl w-full mx-auto">
              {messages.map(msg => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onViewDoc={handleViewDoc}
                  onOpenAddDocWithGap={handleDraftDocFromGap}
                  onReportGap={handleReportGapManual}
                />
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-[85%] items-start my-2">
                  <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 bg-slate-900 flex items-center justify-center shrink-0">
                    <img
                      src="/chimobi_logo.jpg"
                      alt="Chimobi Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3 text-xs text-slate-600">
                    <Loader2 className="w-4 h-4 text-[#2563eb] animate-spin shrink-0" />
                    <span>Chimobi is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Preset Benchmark Drawer (Admin view only) */}
        {isAdmin && (
          <PresetQueries
            onSelectQuery={q => {
              setInputQuery(q);
              handleSendQuery(q);
            }}
            disabled={isLoading}
          />
        )}

        {/* Floating Input Area (Chatbox) */}
        <div className="px-4 sm:px-12 md:px-16 pt-2 pb-6 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/95 to-transparent shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-2.5 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] focus-within:border-[#2563eb]/40 focus-within:ring-4 focus-within:ring-[#2563eb]/10 transition-all">
              <textarea
                ref={inputRef}
                id="query-input"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Chimobi..."
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-slate-800 placeholder-slate-400 resize-none px-3 py-1.5 leading-relaxed custom-scrollbar"
              />

              <button
                id="send-query-btn"
                onClick={() => handleSendQuery(inputQuery)}
                disabled={!inputQuery.trim() || isLoading}
                className={`px-4 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-[13px] transition-all flex items-center gap-1.5 shrink-0 ${
                  !inputQuery.trim() || isLoading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-xs cursor-pointer'
                }`}
                title="Send message (Enter)"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals & Dialogs */}
      <KnowledgeBaseModal
        isOpen={isKbModalOpen}
        onClose={() => setIsKbModalOpen(false)}
        documents={documents}
        selectedDocIds={selectedDocIds}
        onToggleSelectDoc={handleToggleSelectDoc}
        onSelectAllDocs={handleSelectAllDocs}
        onDeselectAllDocs={handleDeselectAllDocs}
        onViewDoc={handleViewDoc}
        onOpenAddDoc={() => {
          setIsKbModalOpen(false);
          setInitialDraftQuery(undefined);
          setIsAddDocModalOpen(true);
        }}
        onDeleteDoc={handleDeleteDocument}
        onResetDefaults={handleResetDefaults}
      />

      <DocumentViewerModal
        isOpen={Boolean(viewingDoc)}
        document={viewingDoc}
        highlightQuote={highlightQuote}
        onClose={() => {
          setViewingDoc(null);
          setHighlightQuote(undefined);
        }}
        onUpdateDoc={handleUpdateDocument}
      />

      <AddDocumentModal
        isOpen={isAddDocModalOpen}
        onClose={() => {
          setIsAddDocModalOpen(false);
          setInitialDraftQuery(undefined);
        }}
        onAddDocument={handleAddDocument}
        initialQuery={initialDraftQuery}
      />

      <DocGapModal
        isOpen={isGapModalOpen}
        onClose={() => setIsGapModalOpen(false)}
        gaps={gaps}
        onClearGaps={() => setGaps([])}
        onDraftDocForGap={handleDraftDocFromGap}
      />
    </div>
  );
}
