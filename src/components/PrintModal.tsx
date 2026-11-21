import React, { useMemo, useState } from 'react';
import { FileText, Printer, X } from 'lucide-react';
import { renderErmToSvgString } from '../engine/svgExport';
import { useEditorStore } from '../store/editorStore';
import { useTranslation } from '../store/i18n';

export interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PageFormat = 'A4' | 'A3' | 'Letter';
type Orientation = 'portrait' | 'landscape';

const PAGE_DIMENSIONS_MM: Record<PageFormat, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 215.9, h: 279.4 },
};

export const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose }) => {
  const appSettings = useEditorStore((s) => s.appSettings);
  const activeTab = useEditorStore((s) => s.tabs.find((tab) => tab.tabId === s.activeTabId) ?? s.tabs[0]);
  const { t, language } = useTranslation();
  const isDe = language === 'de';

  const [pageFormat, setPageFormat] = useState<PageFormat>('A4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [marginMm, setMarginMm] = useState<number>(12);
  const [scaleToFit, setScaleToFit] = useState<boolean>(true);
  const [showHeader, setShowHeader] = useState<boolean>(true);

  const doc = activeTab?.document;

  const svgPreview = useMemo(() => {
    if (!doc) return '';
    return renderErmToSvgString(doc, {
      darkMode: false,
      padding: 24,
      background: '#ffffff',
    });
  }, [doc]);

  if (!isOpen || !doc) return null;

  const isDark =
    appSettings.theme === 'dark' ||
    (appSettings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const rawDims = PAGE_DIMENSIONS_MM[pageFormat];
  const pageWidthMm = orientation === 'landscape' ? rawDims.h : rawDims.w;
  const pageHeightMm = orientation === 'landscape' ? rawDims.w : rawDims.h;

  const previewScale = 1.45;
  const previewWidthPx = Math.round(pageWidthMm * previewScale);
  const previewHeightPx = Math.round(pageHeightMm * previewScale);
  const previewMarginPx = Math.round(marginMm * previewScale);

  const handlePrint = () => {
    window.print();
  };

  const panelBg = isDark
    ? 'bg-slate-900 text-slate-100 border-slate-700'
    : 'bg-white text-slate-900 border-slate-200';
  const inputCls = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500'
    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600';

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${pageFormat} ${orientation};
            margin: ${marginMm}mm;
          }
        }
      `}</style>

      {/* Dedicated print-only output */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-0 m-0 z-[9999]">
        <div className="flex flex-col justify-between min-h-screen">
          {showHeader && (
            <div className="text-xs text-slate-600 border-b border-slate-300 pb-2 mb-4 flex items-center justify-between">
              <span className="font-semibold">{doc.name}</span>
              <span>ERM-Editor ({doc.notationMode === 'chen' ? 'Chen' : 'Min-Max'})</span>
            </div>
          )}
          <div
            className={`flex-1 flex items-center justify-center ${
              scaleToFit ? '[&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[85vh]' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: svgPreview }}
          />
        </div>
      </div>

      {/* Modal UI */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`w-full max-w-5xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${panelBg}`}
          role="dialog"
          aria-modal="true"
          aria-label={t('print.title')}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-5 py-3.5 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Printer className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-semibold">{t('print.title')}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
              aria-label={t('print.cancel')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
            {/* Left Settings Column */}
            <div
              className={`lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r overflow-y-auto space-y-4 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    {isDe ? 'Papierformat' : 'Page Format'}
                  </label>
                  <select
                    value={pageFormat}
                    onChange={(e) => setPageFormat(e.target.value as PageFormat)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-sm outline-none ${inputCls}`}
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    {t('print.orientation')}
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as Orientation)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-sm outline-none ${inputCls}`}
                  >
                    <option value="portrait">{t('print.portrait')}</option>
                    <option value="landscape">{t('print.landscape')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  {isDe ? 'Seitenrand (mm)' : 'Margin (mm)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={marginMm}
                  onChange={(e) => setMarginMm(Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${inputCls}`}
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={scaleToFit}
                    onChange={(e) => setScaleToFit(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-xs font-medium">
                    {isDe ? 'Auf Seitengröße skalieren' : 'Scale to fit page'}
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showHeader}
                    onChange={(e) => setShowHeader(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-xs font-medium">
                    {isDe ? 'Kopfzeile mit Diagrammname' : 'Header with diagram name'}
                  </span>
                </label>
              </div>

              <div
                className={`rounded-lg border p-3 text-xs ${
                  isDark
                    ? 'border-slate-800 bg-slate-800/40 text-slate-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 font-medium mb-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isDe ? 'Hinweis zu PDF-Export' : 'PDF Export Tip'}</span>
                </div>
                <p>
                  {isDe
                    ? 'Im Druckdialog deines Systems kannst du direkt „Als PDF sichern“ wählen.'
                    : 'In your system print dialog, choose "Save as PDF" to export a vector PDF.'}
                </p>
              </div>
            </div>

            {/* Right Live Preview Column */}
            <div
              className={`lg:col-span-8 p-6 overflow-auto flex items-center justify-center ${
                isDark ? 'bg-slate-950' : 'bg-slate-100'
              }`}
            >
              <div
                className="bg-white text-black shadow-xl border border-slate-300 flex flex-col justify-between shrink-0"
                style={{
                  width: previewWidthPx,
                  height: previewHeightPx,
                  padding: previewMarginPx,
                }}
              >
                {showHeader && (
                  <div className="text-[10px] text-slate-500 border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
                    <span className="font-semibold truncate">{doc.name}</span>
                    <span>ERM-Editor</span>
                  </div>
                )}
                <div
                  className="flex-1 flex items-center justify-center overflow-hidden [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: svgPreview }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-end gap-2 px-5 py-3.5 border-t ${
              isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {t('print.cancel')}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              {t('print.print')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
