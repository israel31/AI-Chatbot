
import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  X,
  Tag,
  Calendar,
  User,
  Copy,
  Check,
  ShieldCheck,
  Edit3,
  Save,
} from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  highlightQuote?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDoc?: (updated: DocumentItem) => Promise<void>;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  highlightQuote,
  isOpen,
  onClose,
  onUpdateDoc,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (document) {
      setEditedContent(document.content);
      setIsEditing(false);
      setSaveError('');
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setSaveError('Could not copy the document content.');
    }
  };

  const handleSave = async () => {
    if (!onUpdateDoc || !document || isSaving) return;

    if (!editedContent.trim()) {
      setSaveError('Document content cannot be empty.');
      return;
    }

    if (editedContent.trim().length > 500_000) {
      setSaveError('Document content exceeds the 500,000-character limit.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      await onUpdateDoc({
        ...document,
        content: editedContent.trim(),
        lastUpdated: new Date().toISOString().split('T')[0],
      });

      setIsEditing(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not save document changes.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError('');
    setEditedContent(document.content);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                {document.id}
              </span>

              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">
                {document.category}
              </span>

              <span className="text-xs text-slate-400">
                v{document.version}
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {document.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {document.author}
              </span>

              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Last updated: {document.lastUpdated}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Copy markdown content"
              aria-label="Copy document content"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {onUpdateDoc && !document.isDefault && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleCancelEdit();
                  } else {
                    setEditedContent(document.content);
                    setSaveError('');
                    setIsEditing(true);
                  }
                }}
                disabled={isSaving}
                className={`p-2 rounded-lg transition-colors ${isEditing
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                  } disabled:opacity-50`}
                title={isEditing ? 'Cancel edit' : 'Edit document'}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              aria-label="Close document viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Citation highlight */}
        {highlightQuote && !isEditing && (
          <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200 flex items-start gap-2 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />

            <div>
              <span className="font-semibold">
                Cited Excerpt in Active Response:{' '}
              </span>
              <span className="italic">"{highlightQuote}"</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="space-y-3 h-full flex flex-col">
              <label className="text-xs font-semibold text-slate-700">
                Document Markdown Content:
              </label>

              <textarea
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                disabled={isSaving}
                maxLength={500_000}
                className="w-full flex-1 min-h-[360px] p-4 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 bg-slate-50 disabled:opacity-70"
              />

              <div className="text-right text-[11px] text-slate-400">
                {editedContent.length.toLocaleString()} characters
              </div>
            </div>
          ) : (
            <div className="prose prose-sm prose-slate max-w-none">
              <Markdown>{document.content}</Markdown>
            </div>
          )}
        </div>

        {/* Error */}
        {saveError && (
          <div className="mx-6 mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {saveError}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              Tags: {document.tags.join(', ')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isSaving ? 'Saving and processing…' : 'Save Changes'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
              >
                Close Viewer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
