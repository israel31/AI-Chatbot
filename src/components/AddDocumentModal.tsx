
import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { DocumentItem } from '../types';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (doc: DocumentItem) => Promise<void>;
  initialQuery?: string;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onAddDocument,
  initialQuery,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState<DocumentItem['category']>('Custom');
  const [author, setAuthor] = useState('Knowledge Custodian');
  const [version, setVersion] = useState('1.0');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setTitle(`Policy / Spec regarding: ${initialQuery.slice(0, 40)}`);
      setSummary(
        `Internal documentation answering inquiries related to: ${initialQuery}`
      );
      setContent(
        `# Policy: ${initialQuery}\n\n` +
        '## 1. Overview\n' +
        'Document internal standards and protocols here.\n\n' +
        '## 2. Guidelines & Procedures\n' +
        '- Add specific rules, numbers, and deadlines.\n'
      );
    } else {
      setTitle('');
      setSummary('');
      setContent('');
      setTags('');
    }

    setError('');
  }, [initialQuery, isOpen]);

  function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return generateId();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  if (!isOpen) return null;

  const processFile = (file: File) => {
    const allowedExtensions = /\.(txt|md|markdown|json|csv)$/i;

    if (!allowedExtensions.test(file.name)) {
      setError('Unsupported file type. Upload a .md, .txt, .json, or .csv file.');
      return;
    }

    if (file.size > 500_000) {
      setError('File is too large. The maximum supported size is 500 KB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {
      const text = event.target?.result;

      if (typeof text === 'string') {
        setContent(text);
        setError('');

        if (!title) {
          const cleanName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]/g, ' ');

          setTitle(
            cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
          );
        }

        if (!summary) {
          setSummary(
            `Uploaded from ${file.name} on ${new Date().toLocaleDateString()}`
          );
        }
      }
    };

    reader.onerror = () => {
      setError('Could not read this file. Please try another file.');
    };

    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }

    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSaving) return;

    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!content.trim()) {
      setError('Document content cannot be empty.');
      return;
    }

    if (content.trim().length > 500_000) {
      setError('Document content exceeds the 500,000-character limit.');
      return;
    }

    const parsedTags = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    const newDoc: DocumentItem = {
      id: `DOC-CUST-${generateId()}`,
      title: title.trim(),
      category,
      author: author.trim() || 'Knowledge Custodian',
      version: version.trim() || '1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      summary: summary.trim() || title.trim(),
      content: content.trim(),
      tags: parsedTags.length
        ? parsedTags
        : ['internal', category.toLowerCase()],
      isDefault: false,
    };

    setIsSaving(true);
    setError('');

    try {
      await onAddDocument(newDoc);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save this document. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
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
              <h2 className="text-base font-bold text-slate-900">
                Add Internal Company Document
              </h2>
              <p className="text-xs text-slate-500">
                Add policies, guides, procedures, or other JCIN UNIBEN documents.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            aria-label="Close document form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File upload */}
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${dragActive
              ? 'border-[#2563eb] bg-blue-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
              }`}
          >
            <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />

            <p className="text-xs font-semibold text-slate-700">
              Drag and drop a document here
            </p>

            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports .md, .txt, .json, and .csv — maximum 500 KB
            </p>

            <label className="mt-2.5 inline-block cursor-pointer">
              <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-2xs">
                Browse file from computer
              </span>

              <input
                type="file"
                accept=".txt,.md,.markdown,.json,.csv"
                onChange={handleFileInput}
                disabled={isSaving}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Document Title *
              </label>

              <input
                type="text"
                placeholder="e.g., Membership Dues and Payment Policy"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isSaving}
                maxLength={300}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Department / Category
              </label>

              <select
                value={category}
                onChange={e =>
                  setCategory(e.target.value as DocumentItem['category'])
                }
                disabled={isSaving}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 bg-white"
              >
                <option value="Membership">Membership</option>
                <option value="Training & Development">Training & Development</option>
                <option value="Events & Programs">Events & Programs</option>
                <option value="Leadership">Leadership</option>
                <option value="Constitution & Governance">Constitution & Governance</option>
                <option value="Public Relations">Public Relations</option>
                <option value="Operations">Operations</option>
                <option value="Custom">Custom / General</option>
              </select>
            </div>

            {/* Author */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Author / Custodian
              </label>

              <input
                type="text"
                placeholder="e.g., JCIN UNIBEN Executive Council"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>

            {/* Version */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Version
              </label>

              <input
                type="text"
                value={version}
                onChange={e => setVersion(e.target.value)}
                disabled={isSaving}
                placeholder="1.0"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>

            {/* Summary */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Summary / Scope
              </label>

              <input
                type="text"
                placeholder="Briefly describe what this document covers"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Tags (comma-separated)
              </label>

              <input
                type="text"
                placeholder="e.g., membership, dues, policy"
                value={tags}
                onChange={e => setTags(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>

            {/* Document content */}
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
                placeholder="Paste or write the full document here. Use headings and lists where appropriate."
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={isSaving}
                rows={10}
                maxLength={500_000}
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
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Check className="w-4 h-4" />
              )}

              <span>
                {isSaving
                  ? 'Processing and saving…'
                  : 'Add to Knowledge Base'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
