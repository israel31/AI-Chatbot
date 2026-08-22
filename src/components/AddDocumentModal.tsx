import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Plus, Sparkles, Check, AlertCircle } from 'lucide-react';
import { DocumentItem } from '../types';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (doc: DocumentItem) => void;
  initialQuery?: string;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onAddDocument,
  initialQuery,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentItem['category']>('Custom');
  const [author, setAuthor] = useState('Knowledge Custodian');
  const [version, setVersion] = useState('1.0');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialQuery) {
      setTitle(`Policy / Spec regarding: ${initialQuery.slice(0, 40)}`);
      setSummary(`Internal documentation answering inquiries related to: ${initialQuery}`);
      setContent(`# Policy: ${initialQuery}\n\n## 1. Overview\nDocument internal standards and protocols here.\n\n## 2. Guidelines & Procedures\n- Add specific rules, numbers, and deadlines.\n`);
    } else {
      setTitle('');
      setSummary('');
      setContent('');
      setTags('');
    }
    setError('');
  }, [initialQuery, isOpen]);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        setContent(text);
        if (!title) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
        if (!summary) {
          setSummary(`Uploaded from ${file.name} on ${new Date().toLocaleDateString()}`);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Document content cannot be empty.');
      return;
    }

    const docId = `DOC-CUST-${Date.now().toString().slice(-4)}`;
    const parsedTags = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newDoc: DocumentItem = {
      id: docId,
      title: title.trim(),
      category: category,
      author: author.trim() || 'Knowledge Custodian',
      version: version.trim() || '1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      summary: summary.trim() || title.trim(),
      content: content.trim(),
      tags: parsedTags.length > 0 ? parsedTags : ['internal', category.toLowerCase()],
      isDefault: false,
    };

    onAddDocument(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563eb]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Internal Company Document</h2>
              <p className="text-xs text-slate-500">
                Ground the AI strictly on your company's new policies, runbooks, or specs
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File Upload Drop Zone */}
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
              dragActive
                ? 'border-[#2563eb] bg-blue-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
            }`}
          >
            <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              Drag and drop markdown, text, or policy files here
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Supports .md, .txt, .json, .csv</p>
            <label className="mt-2.5 inline-block cursor-pointer">
              <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-2xs">
                Browse file from computer
              </span>
              <input
                type="file"
                accept=".txt,.md,.markdown,.json,.csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Document Title *</label>
              <input
                type="text"
                placeholder="e.g., Q3 On-Call Rotation & Incident Escalation Guide"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Department / Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 bg-white"
              >
                <option value="HR & Benefits">HR & Benefits</option>
                <option value="Security & Compliance">Security & Compliance</option>
                <option value="Engineering">Engineering</option>
                <option value="Finance & Travel">Finance & Travel</option>
                <option value="Operations">Operations</option>
                <option value="Product">Product</option>
                <option value="Custom">Custom / General</option>
              </select>
            </div>

            {/* Author */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Author / Custodian</label>
              <input
                type="text"
                placeholder="e.g., Security Operations Team"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>

            {/* Summary */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Summary / Scope</label>
              <input
                type="text"
                placeholder="Brief high-level description of what this policy covers"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., pto, policy, engineering, billing, sla"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>

            {/* Content Body */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Document Content (Markdown / Text) *
                </label>
                <span className="text-[11px] text-slate-400">
                  {content.length.toLocaleString()} characters
                </span>
              </div>
              <textarea
                placeholder="Paste or write your full document text here. Use markdown headers (#, ##, -) for best citation retrieval..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={10}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 bg-slate-50/50"
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Add to Knowledge Base</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
