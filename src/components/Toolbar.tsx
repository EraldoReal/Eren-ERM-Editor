import React from 'react';
import {
  Camera,
  Database,
  Link2,
  Moon,
  MousePointer2,
  Printer,
  Redo2,
  Settings,
  Sparkles,
  Sun,
  Undo2,
} from 'lucide-react';
import { type EditorTool, useEditorStore } from '../store/editorStore';
import { useTranslation } from '../store/i18n';
import { takeErmScreenshot } from './MenuBar';

export interface ToolbarProps {
  onOpenSettings: () => void;
  onOpenPrint: () => void;
}

function ErmToolIcon({ tool }: { tool: EditorTool }) {
  switch (tool) {
    case 'select':
      return <MousePointer2 className="w-4 h-4" />;
    case 'entity':
      return (
        <svg viewBox="0 0 24 20" fill="none" className="w-4 h-4" aria-hidden="true">
          <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'relationship':
      return (
        <svg viewBox="0 0 24 20" fill="none" className="w-4 h-4" aria-hidden="true">
          <polygon points="12,2.5 21.5,10 12,17.5 2.5,10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'attribute':
      return (
        <svg viewBox="0 0 24 20" fill="none" className="w-4 h-4" aria-hidden="true">
          <ellipse cx="12" cy="10" rx="9" ry="6" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'connect':
      return <Link2 className="w-4 h-4" />;
  }
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onOpenSettings,
  onOpenPrint,
}) => {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const activeTab = useEditorStore((s) => s.tabs.find((tab) => tab.tabId === s.activeTabId) ?? s.tabs[0]);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const toggleWeakEntity = useEditorStore((s) => s.toggleWeakEntity);
  const toggleIdentifyingRelationship = useEditorStore((s) => s.toggleIdentifyingRelationship);
  const toggleAttributeFlag = useEditorStore((s) => s.toggleAttributeFlag);
  const autoLayoutNodeAttributes = useEditorStore((s) => s.autoLayoutNodeAttributes);
  const setNotationMode = useEditorStore((s) => s.setNotationMode);
  const isRelationalSidebarOpen = useEditorStore((s) => s.isRelationalSidebarOpen);
  const toggleRelationalSidebar = useEditorStore((s) => s.toggleRelationalSidebar);
  const appSettings = useEditorStore((s) => s.appSettings);
  const updateAppSettings = useEditorStore((s) => s.updateAppSettings);

  const { t, language } = useTranslation();
  const isDe = language === 'de';

  const doc = activeTab?.document;
  const canUndo = (activeTab?.undoStack.length ?? 0) > 0;
  const canRedo = (activeTab?.redoStack.length ?? 0) > 0;

  const isDark =
    appSettings.theme === 'dark' ||
    (appSettings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const selectedNode =
    selectedNodeIds.length === 1 && doc
      ? doc.nodes.find((n) => n.id === selectedNodeIds[0]) ?? null
      : null;

  const isEntity = selectedNode?.type === 'entity';
  const isRelationship = selectedNode?.type === 'relationship';
  const isAttribute = selectedNode?.type === 'attribute';

  const tools: Array<{ id: EditorTool; label: string }> = [
    { id: 'select', label: t('tool.select') },
    { id: 'entity', label: t('tool.entity') },
    { id: 'relationship', label: t('tool.relationship') },
    { id: 'attribute', label: t('tool.attribute') },
    { id: 'connect', label: t('tool.connect') },
  ];

  const toggleBtnCls = (active: boolean, disabled: boolean) =>
    `px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
      disabled
        ? 'opacity-40 pointer-events-none border-transparent text-slate-400 dark:text-slate-600'
        : active
          ? 'bg-blue-600 text-white border-blue-600 cursor-pointer'
          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer'
    }`;

  return (
    <div className="flex items-center flex-wrap gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-700 select-none">
      {/* Quick Tools */}
      <div className="flex items-center gap-0.5 bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-lg">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={isActive}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700'
              }`}
            >
              <ErmToolIcon tool={tool.id} />
              <span className="hidden xl:inline">{tool.label.replace(/\s*\([A-Z]\)$/, '')}</span>
            </button>
          );
        })}
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title={`${t('menu.edit.undo')} (Ctrl+Z)`}
          aria-label={t('menu.edit.undo')}
          className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title={`${t('menu.edit.redo')} (Ctrl+Shift+Z)`}
          aria-label={t('menu.edit.redo')}
          className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

      {/* 1-Click Element Toggles */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!isAttribute}
          onClick={() => selectedNode && toggleAttributeFlag(selectedNode.id, 'isPrimaryKey')}
          title={t('action.primaryKey')}
          className={toggleBtnCls(Boolean(selectedNode?.isPrimaryKey), !isAttribute)}
        >
          PK
        </button>
        <button
          type="button"
          disabled={!isAttribute}
          onClick={() => selectedNode && toggleAttributeFlag(selectedNode.id, 'isForeignKey')}
          title={t('action.foreignKey')}
          className={toggleBtnCls(Boolean(selectedNode?.isForeignKey), !isAttribute)}
        >
          FK
        </button>
        <button
          type="button"
          disabled={!isAttribute}
          onClick={() => selectedNode && toggleAttributeFlag(selectedNode.id, 'isMultivalued')}
          title={t('action.multivalued')}
          className={toggleBtnCls(Boolean(selectedNode?.isMultivalued), !isAttribute)}
        >
          {isDe ? 'Mehrwertig' : 'Multivalued'}
        </button>
        <button
          type="button"
          disabled={!isAttribute}
          onClick={() => selectedNode && toggleAttributeFlag(selectedNode.id, 'isDerived')}
          title={t('action.derived')}
          className={toggleBtnCls(Boolean(selectedNode?.isDerived), !isAttribute)}
        >
          {isDe ? 'Abgeleitet' : 'Derived'}
        </button>
        <button
          type="button"
          disabled={!isEntity}
          onClick={() => selectedNode && toggleWeakEntity(selectedNode.id)}
          title={t('action.weakEntity')}
          className={toggleBtnCls(Boolean(selectedNode?.isWeak), !isEntity)}
        >
          {isDe ? 'Schwach' : 'Weak'}
        </button>
        <button
          type="button"
          disabled={!isRelationship}
          onClick={() => selectedNode && toggleIdentifyingRelationship(selectedNode.id)}
          title={t('action.identifyingRelationship')}
          className={toggleBtnCls(Boolean(selectedNode?.isIdentifying), !isRelationship)}
        >
          {isDe ? 'Identifizierend' : 'Identifying'}
        </button>
        <button
          type="button"
          disabled={!isEntity && !isRelationship}
          onClick={() => selectedNode && autoLayoutNodeAttributes(selectedNode.id)}
          title={t('action.autoLayoutAttributes')}
          className={`inline-flex items-center gap-1 ${toggleBtnCls(false, !isEntity && !isRelationship)}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">
            {isDe ? 'Attribute anordnen' : 'Auto-Layout'}
          </span>
        </button>
      </div>

      <div className="flex-1" />

      {/* Notation Switch (Chen | Min-Max) */}
      <div
        className="flex items-center rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium"
        role="group"
        aria-label={t('status.notation')}
      >
        <button
          type="button"
          onClick={() => setNotationMode('chen')}
          className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
            doc?.notationMode === 'chen'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Chen
        </button>
        <button
          type="button"
          onClick={() => setNotationMode('minmax')}
          className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
            doc?.notationMode === 'minmax'
              ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Min-Max
        </button>
      </div>

      {/* 1-Klick-Screenshot */}
      <button
        type="button"
        onClick={() => void takeErmScreenshot()}
        title={t('action.screenshot')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
      >
        <Camera className="w-3.5 h-3.5" />
        <span className="hidden md:inline">{t('action.screenshot')}</span>
      </button>

      {/* Relational Model Sidebar Toggle */}
      <button
        type="button"
        onClick={toggleRelationalSidebar}
        title={t('action.toggleSidebar')}
        aria-pressed={isRelationalSidebarOpen}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
          isRelationalSidebarOpen
            ? 'bg-blue-600 text-white border-blue-600'
            : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
        }`}
      >
        <Database className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('action.toggleSidebar')}</span>
      </button>

      {/* Print */}
      <button
        type="button"
        onClick={onOpenPrint}
        title={`${t('menu.file.print')} (Ctrl+P)`}
        aria-label={t('menu.file.print')}
        className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <Printer className="w-4 h-4" />
      </button>

      {/* DE | EN Switch */}
      <div className="flex items-center rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
        <button
          type="button"
          onClick={() => updateAppSettings({ language: 'de' })}
          className={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
            language === 'de'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          DE
        </button>
        <button
          type="button"
          onClick={() => updateAppSettings({ language: 'en' })}
          className={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
            language === 'en'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          EN
        </button>
      </div>

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={() => updateAppSettings({ theme: isDark ? 'light' : 'dark' })}
        title={t('action.toggleTheme')}
        aria-label={t('action.toggleTheme')}
        className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Settings */}
      <button
        type="button"
        onClick={onOpenSettings}
        title={`${t('menu.view.settings')} (Ctrl+,)`}
        aria-label={t('menu.view.settings')}
        className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
};
