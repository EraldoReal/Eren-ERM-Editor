import React, { useMemo, useState } from 'react';
import { Check, Copy, Database, Table2, X } from 'lucide-react';
import { deriveRelationalModel, type RelationalTable } from '../engine/relationalModel.ts';
import { generateSqlFromRelationalModel } from '../engine/sqlGenerator.ts';
import { useEditorStore } from '../store/editorStore.ts';
import { useTranslation } from '../store/i18n.ts';

type SidebarTab = 'relational' | 'sql';

function formatTableNotationText(table: RelationalTable): string {
  const cols = table.columns.map((col) => {
    const prefix = col.isForeignKey ? '↑' : '';
    const suffix = col.isPrimaryKey ? ' (PK)' : '';
    return `${prefix}${col.name}${suffix}`;
  });
  return `${table.name}(${cols.join(', ')})`;
}

export const RelationalSidebar: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useEditorStore((s) => s.isRelationalSidebarOpen);
  const toggleSidebar = useEditorStore((s) => s.toggleRelationalSidebar);
  const activeTab = useEditorStore((s) => s.getActiveTab());
  const showToast = useEditorStore((s) => s.showToast);

  const [tab, setTab] = useState<SidebarTab>('relational');
  const [includeDerived, setIncludeDerived] = useState(false);
  const [copiedKey, setCopiedKey] = useState<SidebarTab | null>(null);

  const tables = useMemo(
    () => deriveRelationalModel(activeTab.document, { includeDerived }),
    [activeTab.document, includeDerived],
  );

  const sqlText = useMemo(() => generateSqlFromRelationalModel(tables), [tables]);

  const relationalPlainText = useMemo(
    () => tables.map(formatTableNotationText).join('\n'),
    [tables],
  );

  if (!isOpen) {
    return null;
  }

  const handleCopy = async (kind: SidebarTab) => {
    const text = kind === 'relational' ? relationalPlainText : sqlText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(kind);
      showToast(
        kind === 'relational' ? t('toast.relationalCopied') : t('toast.sqlCopied'),
        'success',
      );
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === kind ? null : prev));
      }, 1800);
    } catch {
      showToast('Clipboard error', 'error');
    }
  };

  const kindLabel = (kind: RelationalTable['sourceKind']) => {
    switch (kind) {
      case 'entity':
        return t('sidebar.kindEntity');
      case 'weak_entity':
        return t('sidebar.kindWeakEntity');
      case 'relationship_nm':
        return t('sidebar.kindRelationshipNm');
      case 'multivalued_attribute':
        return t('sidebar.kindMultivalued');
    }
  };

  return (
    <aside className="no-print flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {t('sidebar.title')}
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t('sidebar.tablesCount', { count: tables.length })}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          title={t('settings.close')}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-2 pt-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setTab('relational')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'relational'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          {t('sidebar.relationalTab')}
        </button>
        <button
          type="button"
          onClick={() => setTab('sql')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'sql'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          {t('sidebar.sqlTab')}
        </button>
      </div>

      {/* Options bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2 dark:border-slate-800/80 dark:bg-slate-900/60">
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeDerived}
            onChange={(e) => setIncludeDerived(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
          />
          {t('sidebar.includeDerived')}
        </label>

        {tables.length > 0 && (
          <button
            type="button"
            onClick={() => handleCopy(tab)}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {copiedKey === tab ? (
              <>
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                {t('sidebar.copied')}
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                {tab === 'relational' ? t('sidebar.copyRelational') : t('sidebar.copySql')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {tables.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <Table2 className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t('sidebar.empty')}
            </p>
          </div>
        ) : tab === 'relational' ? (
          <div className="space-y-3">
            {tables.map((table) => (
              <div
                key={`${table.sourceNodeId}_${table.name}`}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                    {table.name}
                  </span>
                  <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {kindLabel(table.sourceKind)}
                  </span>
                </div>

                {/* Relational notation line: Table(PK, col, ↑fk) */}
                <div className="font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-200 break-words">
                  <span className="font-semibold">{table.name}</span>
                  <span>(</span>
                  {table.columns.map((col, idx) => (
                    <React.Fragment key={`${col.name}_${idx}`}>
                      {idx > 0 && <span className="text-slate-400">, </span>}
                      <span
                        title={
                          col.isForeignKey && col.referencesTable
                            ? `FK → ${col.referencesTable}.${col.referencesColumn ?? ''}`
                            : undefined
                        }
                        className={`${
                          col.isPrimaryKey
                            ? 'underline decoration-slate-900 decoration-2 underline-offset-2 font-semibold dark:decoration-slate-100'
                            : ''
                        } ${
                          col.isForeignKey
                            ? 'text-blue-700 dark:text-blue-300'
                            : ''
                        }`}
                      >
                        {col.isForeignKey ? `↑${col.name}` : col.name}
                      </span>
                    </React.Fragment>
                  ))}
                  <span>)</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-100 dark:border-slate-800">
            <code>{sqlText}</code>
          </pre>
        )}
      </div>
    </aside>
  );
};
