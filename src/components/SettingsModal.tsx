import React, { useEffect, useState } from 'react';
import { RotateCcw, Sliders, X } from 'lucide-react';
import { DEFAULT_APP_SETTINGS } from '../model/defaults';
import type { AppSettings, GridStyle, LanguageCode, NotationMode, ThemeMode } from '../model/types';
import { useEditorStore } from '../store/editorStore';
import { useTranslation } from '../store/i18n';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const appSettings = useEditorStore((s) => s.appSettings);
  const updateAppSettings = useEditorStore((s) => s.updateAppSettings);
  const { t, language } = useTranslation();

  const [draft, setDraft] = useState<AppSettings>(appSettings);

  // Only reset the draft when the dialog opens; later store changes (e.g. async settings
  // load) must not discard what the user is currently editing.
  useEffect(() => {
    if (isOpen) {
      setDraft(useEditorStore.getState().appSettings);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDark =
    draft.theme === 'dark' ||
    (draft.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleSave = () => {
    // Keep the current recent-files list; the draft only holds a snapshot from opening time
    updateAppSettings({
      ...draft,
      recentFiles: useEditorStore.getState().appSettings.recentFiles,
    });
    onClose();
  };

  const handleReset = () => {
    setDraft({
      ...DEFAULT_APP_SETTINGS,
      recentFiles: draft.recentFiles,
    });
  };

  const panelBg = isDark
    ? 'bg-slate-900 text-slate-100 border-slate-700'
    : 'bg-white text-slate-900 border-slate-200';
  const inputCls = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500'
    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${panelBg}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title')}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold">{t('settings.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            aria-label={t('settings.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">
                {t('settings.language')}
              </label>
              <select
                value={draft.language}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    language: e.target.value as LanguageCode,
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${inputCls}`}
              >
                <option value="de">{t('settings.languageDe')} (DE)</option>
                <option value="en">{t('settings.languageEn')} (EN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">
                {t('settings.theme')}
              </label>
              <select
                value={draft.theme}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    theme: e.target.value as ThemeMode,
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${inputCls}`}
              >
                <option value="light">{t('settings.themeLight')}</option>
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="system">{t('settings.themeSystem')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">
                {t('settings.defaultNotation')}
              </label>
              <select
                value={draft.defaultNotationMode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    defaultNotationMode: e.target.value as NotationMode,
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${inputCls}`}
              >
                <option value="chen">{t('status.notationChen')} (1, n, m, c, cn)</option>
                <option value="minmax">{t('status.notationMinMax')} (0,1), (1,n)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">
                {t('settings.defaultGridStyle')}
              </label>
              <select
                value={draft.defaultGridStyle}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    defaultGridStyle: e.target.value as GridStyle,
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${inputCls}`}
              >
                <option value="dots">{t('menu.view.gridDots')}</option>
                <option value="grid">{t('menu.view.gridLines')}</option>
              </select>
            </div>
          </div>

          <div
            className={`rounded-lg border p-3.5 space-y-2.5 ${
              isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.defaultShowGrid}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, defaultShowGrid: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-xs font-medium">{t('settings.defaultGrid')}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.defaultSnapToGrid}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, defaultSnapToGrid: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-xs font-medium">{t('settings.defaultSnapToGrid')}</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-t ${
            isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={handleReset}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {language === 'de' ? 'Zurücksetzen' : 'Reset'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {t('settings.close')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {t('settings.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
