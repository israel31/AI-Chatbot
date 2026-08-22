import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Search,
  CheckSquare,
  Square,
  FileText,
  Tag,
  Calendar,
  User,
  Plus,
  Trash2,
  Eye,
  Check,
  Shield,
  RotateCcw
} from 'lucide-react';
import { DocumentItem } from '../types';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  selectedDocIds: string[];
  onToggleSelectDoc: (id: string) => void;
  onSelectAllDocs: () => void;
  onDeselectAllDocs: () => void;
  onViewDoc: (docId: string) => void;
  onOpenAddDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onResetDefaults: () => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  documents,
  selectedDocIds,
  onToggleSelectDoc,
  onSelectAllDocs,
  onDeselectAllDocs,
  onViewDoc,
  onOpenAddDoc,
  onDeleteDoc,
  onResetDefaults,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', ...Array.from(new Set(documents.map(d => d.category)))];

  const filteredDocs = documents.filter(doc => {
    const matchesCat = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch =
      search.trim() === '' ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.summary.toLowerCase().includes(search.toLowerCase()) ||
      doc.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      doc.content.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563eb]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Internal Company Knowledge Base</h2>
              <p className="text-xs text-slate-500">
                {documents.length} verified documents • {selectedDocIds.length} active in search scope
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="add-doc-modal-btn"
              onClick={onOpenAddDoc}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Bulk Select */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents by keyword, tag, or content..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onSelectAllDocs}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors whitespace-nowrap"
              >
                Select All
              </button>
              <button
                onClick={onDeselectAllDocs}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No internal documents match your search query.
            </div>
          ) : (
            filteredDocs.map(doc => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`pt-3 first:pt-0 p-3 rounded-xl transition-colors ${
                    isSelected ? 'bg-slate-50/60 border border-slate-200/60' : 'opacity-60 bg-white border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => onToggleSelectDoc(doc.id)}
                        className="mt-0.5 text-indigo-600 hover:text-indigo-800 transition-colors"
                        title={isSelected ? 'Included in AI Grounding' : 'Excluded from AI Grounding'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {doc.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer" onClick={() => onViewDoc(doc.id)}>
                            {doc.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                            {doc.category}
                          </span>
                          <span className="text-[10px] text-slate-400">v{doc.version}</span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2">
                          {doc.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {doc.lastUpdated}
                          </span>
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <div className="flex gap-1">
                              {doc.tags.slice(0, 3).map((tag, tIdx) => (
                                <span key={tIdx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onViewDoc(doc.id)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        title="View full document"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      {!doc.isDefault && (
                        <button
                          onClick={() => onDeleteDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete custom document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default Policies</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
