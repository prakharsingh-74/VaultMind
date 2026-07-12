import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckSquare } from 'lucide-react';
import { ClientSpace, MemorySourceType } from '../types';
import { addMemory } from '../services/spaceRouter';

interface MemoryCaptureModalProps {
  space: ClientSpace;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MemoryCaptureModal({ space, onClose, onSuccess }: MemoryCaptureModalProps) {
  const [sourceType, setSourceType] = useState<MemorySourceType>('note');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMsg('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext !== 'txt' && ext !== 'md') {
      setErrorMsg(
        'Compliance Warning: Local PDF/DOCX OCR parsing is restricted in the MVP to guarantee zero cloud leaks. Please copy-paste text directly or drop a plain .txt/.md file.'
      );
      return;
    }

    setFileName(file.name);
    setSourceType('file');

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setText(e.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!isConfirmed) {
      setErrorMsg('You must check the box to confirm this memory belongs exclusively to this client.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const tags = tagInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    try {
      await addMemory(space.id, text.trim(), sourceType, fileName || undefined, tags);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save memory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-charcoal-700 flex justify-between items-center bg-charcoal-900/55">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: space.color }} />
            <h2 className="font-serif text-lg font-semibold text-charcoal-100">
              Ingest Memory — {space.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-charcoal-400 hover:text-charcoal-200 rounded-lg hover:bg-charcoal-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Source Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Memory Source Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['note', 'pasted_email', 'meeting_summary', 'file'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSourceType(type);
                    if (type !== 'file') setFileName('');
                  }}
                  className={`py-2 text-xs rounded-lg border font-medium transition cursor-pointer ${
                    sourceType === type
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-charcoal-900/40 border-charcoal-700 text-charcoal-400 hover:border-charcoal-600'
                  }`}
                >
                  {type === 'note' && 'Client Note'}
                  {type === 'pasted_email' && 'Email Paste'}
                  {type === 'meeting_summary' && 'Meeting Transcript'}
                  {type === 'file' && 'File Upload'}
                </button>
              ))}
            </div>
          </div>

          {/* File Drag and Drop (Only shown or focused for File Upload) */}
          {sourceType === 'file' && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-950/10'
                  : fileName
                  ? 'border-emerald-500/50 bg-emerald-950/5'
                  : 'border-charcoal-700 hover:border-charcoal-600 bg-charcoal-900/20'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.md"
                className="hidden"
              />
              <Upload className={`w-8 h-8 ${fileName ? 'text-emerald-400' : 'text-charcoal-400'}`} />
              <div className="text-xs font-medium text-charcoal-200">
                {fileName ? `Loaded: ${fileName}` : 'Drag & drop .txt or .md files here, or click to browse'}
              </div>
              <p className="text-[10px] text-charcoal-500 text-center">
                Strict Local Ingestion. PDFs should be copy-pasted.
              </p>
            </div>
          )}

          {/* Text Content */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Memory Content</label>
              {sourceType === 'file' && fileName && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {fileName}
                </span>
              )}
            </div>
            <textarea
              required
              rows={sourceType === 'meeting_summary' ? 10 : 6}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={
                sourceType === 'pasted_email'
                  ? 'Paste confidential email correspondence here...'
                  : sourceType === 'meeting_summary'
                  ? 'Paste meeting audio transcription here...'
                  : 'Write client briefing notes, research records, or case summaries here...'
              }
              className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-charcoal-200 placeholder-charcoal-500 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Tags (Optional)</label>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="deal, acquisition, tax, draft (comma separated)"
              className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 text-charcoal-200 placeholder-charcoal-500"
            />
          </div>

          {/* Warnings & Feedback */}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-900/50 flex gap-3 text-xs text-red-300 leading-normal">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Explicit Confirmation Checkbox */}
          <div
            onClick={() => setIsConfirmed(!isConfirmed)}
            className={`p-3.5 rounded-lg border flex gap-3 items-start cursor-pointer transition ${
              isConfirmed
                ? 'bg-indigo-950/15 border-indigo-500/40 text-indigo-200'
                : 'bg-charcoal-900/40 border-charcoal-700/50 text-charcoal-400 hover:border-charcoal-600'
            }`}
          >
            <CheckSquare className={`w-4 h-4 mt-0.5 shrink-0 transition ${isConfirmed ? 'text-indigo-400' : 'text-charcoal-500'}`} />
            <div className="text-xs leading-normal select-none">
              <span className="font-semibold text-charcoal-200">Confirm Client Boundary Allocation:</span> I verify that this data belongs to <span className="font-serif font-bold text-indigo-400">"{space.name}"</span> and is explicitly bound to container tag <span className="font-mono bg-charcoal-900 px-1 py-0.5 rounded text-[10px]">{space.containerTag}</span>. It must not be co-mingled.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-charcoal-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-charcoal-400 hover:text-charcoal-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !text.trim() || !isConfirmed}
              className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-charcoal-800 disabled:text-charcoal-600 rounded-lg font-medium text-white transition flex items-center gap-1.5"
            >
              {isSubmitting ? 'Ingesting...' : 'Confirm & Ingest'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
