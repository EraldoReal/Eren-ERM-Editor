import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { useTranslation } from '../store/i18n';

export const ProjectTabs: React.FC = () => {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const newTab = useEditorStore((s) => s.newTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const renameDocument = useEditorStore((s) => s.renameDocument);

  const { t, language } = useTranslation();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const startRename = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setDraftName(currentName);
  };

  const commitRename = () => {
    if (!editingTabId) return;
    const trimmed = draftName.trim();
    if (trimmed.length > 0) {
      if (editingTabId !== activeTabId) {
        setActiveTab(editingTabId);
      }
      renameDocument(trimmed);
    }
    setEditingTabId(null);
  };

  const cancelRename = () => {
    setEditingTabId(null);
  };

  return (
    <div
      role="tablist"
      aria-label={language === 'de' ? 'Geöffnete Diagramme' : 'Open Diagrams'}
      className="flex items-center gap-1 px-2 pt-1 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 overflow-x-auto select-none"
    >
      {tabs.map((tab) => {
        const isActive = tab.tabId === activeTabId;
        const isEditing = editingTabId === tab.tabId;
        const docName = tab.document.name || t('tabs.untitled');

        return (
          <div
            key={tab.tabId}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(tab.tabId)}
            onDoubleClick={() => startRename(tab.tabId, docName)}
            title={
              language === 'de'
                ? `${docName} (Doppelklick zum Umbenennen)`
                : `${docName} (Double-click to rename)`
            }
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium cursor-pointer border border-b-0 transition-colors max-w-[220px] ${
              isActive
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 -mb-px pb-[7px]'
                : 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab.isDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                title={t('tabs.unsavedChanges')}
              />
            )}

            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-28 px-1 py-0.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-blue-500 rounded outline-none"
              />
            ) : (
              <span className="truncate">
                {docName}
                {tab.isDirty && (
                  <span
                    className="text-amber-500 font-bold ml-0.5"
                    title={t('tabs.unsavedChanges')}
                  >
                    *
                  </span>
                )}
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (tab.isDirty) {
                  const msg =
                    language === 'de'
                      ? `Das Diagramm „${docName}“ enthält ungespeicherte Änderungen. Trotzdem schließen?`
                      : `Diagram "${docName}" has unsaved changes. Close anyway?`;
                  if (!window.confirm(msg)) return;
                }
                closeTab(tab.tabId);
              }}
              title={t('tabs.closeTab')}
              aria-label={`${t('tabs.closeTab')}: ${docName}`}
              className={`p-0.5 rounded hover:bg-slate-300/70 dark:hover:bg-slate-700 transition-opacity ${
                isActive
                  ? 'opacity-70 hover:opacity-100'
                  : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => newTab()}
        title={t('tabs.newTab')}
        aria-label={t('tabs.newTab')}
        className="flex items-center justify-center w-6 h-6 mb-1 ml-0.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
