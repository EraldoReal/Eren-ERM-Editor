import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Link2,
  Loader2,
  Lock,
  Share2,
  X,
} from 'lucide-react';
import {
  createShareLink,
  fetchAndDecryptShare,
  ShareError,
  type CreateShareResult,
} from '../engine/shareClient.ts';
import { useEditorStore } from '../store/editorStore.ts';
import { useTranslation } from '../store/i18n.ts';

function formatShareError(err: unknown, isDe: boolean): string {
  if (err instanceof ShareError) {
    switch (err.code) {
      case 'wrong_app':
        return isDe
          ? `Dieser Link gehört zu einer anderen App (${err.targetApp ?? 'unbekannt'}) und kann nicht im ERM-Editor geöffnet werden.`
          : `This link belongs to another app (${err.targetApp ?? 'unknown'}) and cannot be opened in ERM-Editor.`;
      case 'not_found':
        return isDe
          ? 'Link nicht gefunden oder bereits abgelaufen (max. 24 Stunden gültig).'
          : 'Share link not found or already expired (valid for 24 hours).';
      case 'invalid_token':
        return isDe
          ? 'Ungültiger Link oder Code. Erwartet wird z. B. https://erm.best-tools.app/#s=ID.KEY oder ID.KEY.'
          : 'Invalid link or code. Expected e.g. https://erm.best-tools.app/#s=ID.KEY or ID.KEY.';
      case 'decrypt_failed':
        return isDe
          ? 'Entschlüsselung fehlgeschlagen — der Schlüssel im Link ist ungültig oder die Daten sind beschädigt.'
          : 'Decryption failed — the key in the link is invalid or the data is corrupted.';
      case 'network':
        return isDe
          ? `Verbindung zum Share-Server fehlgeschlagen (${err.message}).`
          : `Could not reach share server (${err.message}).`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

export interface ShareCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareCreateModal: React.FC<ShareCreateModalProps> = ({ isOpen, onClose }) => {
  const { language } = useTranslation();
  const isDe = language === 'de';
  const showToast = useEditorStore((s) => s.showToast);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<CreateShareResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const generateLink = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    setCopied(false);
    try {
      const activeDoc = useEditorStore.getState().getActiveTab().document;
      const created = await createShareLink(activeDoc);
      setResult(created);
      setStatus('ready');
      try {
        await navigator.clipboard.writeText(created.url);
        setCopied(true);
        showToast(
          isDe ? '24h-Link in Zwischenablage kopiert.' : '24h share link copied to clipboard.',
          'success',
        );
      } catch {
        // Clipboard may be blocked in some contexts; user can still click Copy
      }
    } catch (err) {
      setErrorMsg(formatShareError(err, isDe));
      setStatus('error');
    }
  }, [isDe, showToast]);

  useEffect(() => {
    if (isOpen) {
      void generateLink();
    } else {
      setResult(null);
      setCopied(false);
      setErrorMsg('');
    }
  }, [isOpen, generateLink]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isDe ? 'Link erstellen (24h)' : 'Create Share Link (24h)'}
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold">
              {isDe ? 'Link erstellen (24h)' : 'Create Share Link (24h)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={isDe ? 'Schließen' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2.5 py-6 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>
                {isDe ? 'Verschlüssele & erstelle Link…' : 'Encrypting & creating link…'}
              </span>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isDe ? 'Schließen' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => void generateLink()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                >
                  {isDe ? 'Erneut versuchen' : 'Try again'}
                </button>
              </div>
            </div>
          )}

          {status === 'ready' && result && (
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {isDe ? '24 Stunden gültig' : 'Valid for 24 hours'}
                  {result.expiresAt
                    ? ` (${new Date(result.expiresAt).toLocaleString(isDe ? 'de-DE' : 'en-US')})`
                    : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-100 select-all"
                />
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {isDe ? 'Kopiert!' : 'Copied!'}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {isDe ? 'Kopieren' : 'Copy'}
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {isDe
                    ? 'Ende-zu-Ende-verschlüsselt (AES-GCM): Der Schlüssel steckt nur im Link (#s=…) und verlässt deinen Browser nie im Klartext.'
                    : 'End-to-end encrypted (AES-GCM): The decryption key stays in the URL fragment (#s=…) and is never stored on the server.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export interface ShareOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareOpenModal: React.FC<ShareOpenModalProps> = ({ isOpen, onClose }) => {
  const { language } = useTranslation();
  const isDe = language === 'de';
  const loadDocumentInTab = useEditorStore((s) => s.loadDocumentInTab);
  const showToast = useEditorStore((s) => s.showToast);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setErrorMsg('');
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const doc = await fetchAndDecryptShare(input);
      loadDocumentInTab(doc, { filePath: null, fileHandle: null });
      showToast(
        isDe
          ? `Geteiltes ERM geladen: ${doc.name}`
          : `Loaded shared ERM: ${doc.name}`,
        'success',
      );
      onClose();
    } catch (err) {
      setErrorMsg(formatShareError(err, isDe));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isDe ? 'Link öffnen' : 'Open Share Link'}
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold">
              {isDe ? 'Link öffnen…' : 'Open Share Link…'}
            </h2>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            aria-label={isDe ? 'Schließen' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="space-y-1.5">
            <label
              htmlFor="erm-share-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {isDe
                ? 'Teilen-Link oder Code (ID.KEY) einfügen:'
                : 'Paste share link or code (ID.KEY):'}
            </label>
            <input
              ref={inputRef}
              id="erm-share-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://erm.best-tools.app/#s=A7K9M2.xyz…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              {isDe ? 'Abbrechen' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isDe ? 'Öffnen' : 'Open'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
