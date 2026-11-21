import React from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import { isTauriEnvironment } from '../platform/adapter';
import { useEditorStore } from '../store/editorStore';
import { useTranslation } from '../store/i18n';

export const StatusBar: React.FC = () => {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useEditorStore((s) => s.selectedEdgeIds);
  const setZoom = useEditorStore((s) => s.setZoom);
  const toggleNotationMode = useEditorStore((s) => s.toggleNotationMode);
  const activeTab = useEditorStore((s) => s.tabs.find((tab) => tab.tabId === s.activeTabId) ?? s.tabs[0]);

  const { t, language } = useTranslation();
  const isDe = language === 'de';
  const isDesktop = isTauriEnvironment();

  const doc = activeTab?.document;
  const nodeCount = doc?.nodes.length ?? 0;
  const edgeCount = doc?.edges.length ?? 0;
  const zoomPercent = Math.round((doc?.zoom ?? 1) * 100);
  const notationMode = doc?.notationMode ?? 'chen';
  const selectedTotal = selectedNodeIds.length + selectedEdgeIds.length;

  const toolLabels: Record<typeof activeTool, string> = {
    select: t('tool.select'),
    entity: t('tool.entity'),
    relationship: t('tool.relationship'),
    attribute: t('tool.attribute'),
    connect: t('tool.connect'),
  };

  return (
    <footer className="flex items-center justify-between gap-4 px-3 h-7 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 select-none">
      {/* Left: Active tool / selection info */}
      <div className="flex items-center gap-2 min-w-0">
        {activeTool !== 'select' ? (
          <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-medium truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse shrink-0" />
            <span className="truncate">
              {toolLabels[activeTool]}
              {activeTool === 'connect' ? ` — ${t('canvas.connectHint')}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              title={isDe ? 'Werkzeug abwählen (Esc)' : 'Reset to Select (Esc)'}
              className="p-0.5 rounded hover:bg-blue-200/70 dark:hover:bg-blue-800/70 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : selectedTotal > 0 ? (
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
            {t('status.selected')}: {selectedTotal}{' '}
            {selectedNodeIds.length > 0 && selectedEdgeIds.length > 0
              ? `(${selectedNodeIds.length} ${t('status.nodes')}, ${selectedEdgeIds.length} ${t('status.edges')})`
              : selectedNodeIds.length > 0
                ? `(${t('status.nodes')})`
                : `(${t('status.edges')})`}
          </span>
        ) : (
          <span className="truncate text-slate-500 dark:text-slate-400">
            {doc?.name || t('tabs.untitled')} —{' '}
            {activeTab?.isDirty ? t('status.unsaved') : t('status.saved')}
          </span>
        )}
      </div>

      {/* Right: Notation badge, node/edge counts, zoom controls, platform */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={toggleNotationMode}
          title={
            isDe
              ? 'Notation wechseln (Chen / Min-Max)'
              : 'Switch notation (Chen / Min-Max)'
          }
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
            notationMode === 'chen'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900'
          }`}
        >
          {notationMode === 'chen' ? t('status.notationChen') : t('status.notationMinMax')}
        </button>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <span className="tabular-nums">
          {nodeCount} {t('status.nodes')} · {edgeCount} {t('status.edges')}
        </span>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => doc && setZoom(doc.zoom - 0.15)}
            title={t('menu.view.zoomOut')}
            aria-label={t('menu.view.zoomOut')}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title={t('menu.view.zoomReset')}
            className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 tabular-nums font-mono transition-colors cursor-pointer"
          >
            {zoomPercent}%
          </button>
          <button
            type="button"
            onClick={() => doc && setZoom(doc.zoom + 0.15)}
            title={t('menu.view.zoomIn')}
            aria-label={t('menu.view.zoomIn')}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title={t('menu.view.zoomReset')}
            aria-label={t('menu.view.zoomReset')}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[10px] font-medium uppercase tracking-wide">
          {isDesktop ? 'Desktop' : 'Web'}
        </span>
      </div>
    </footer>
  );
};
