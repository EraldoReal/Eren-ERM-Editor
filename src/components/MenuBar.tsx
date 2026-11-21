import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { copyErmScreenshotToClipboard, renderErmToPngBlob } from '../engine/pngExport';
import { deriveRelationalModel } from '../engine/relationalModel';
import { generateSqlFromRelationalModel } from '../engine/sqlGenerator';
import { renderErmToSvgString } from '../engine/svgExport';
import { parseErmFile, serializeErmFile } from '../model/ermFile';
import { getPlatformAdapter, isTauriEnvironment } from '../platform/adapter';
import { useEditorStore } from '../store/editorStore';
import { t as translate, useTranslation } from '../store/i18n';
import type { HelpTab } from './HelpModal';

export interface MenuBarProps {
  onOpenSettings: () => void;
  onOpenPrint: () => void;
  onOpenHelp: (tab?: HelpTab) => void;
  onOpenUpdate?: () => void;
}

type MenuKey = 'file' | 'edit' | 'view' | 'help';

interface WindowWithFsAccess extends Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    excludeAcceptAllOption?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandle>;
}

const IS_MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

function formatShortcut(shortcut: string): string {
  if (!IS_MAC) return shortcut;
  return shortcut.replace(/Ctrl\+/g, '⌘').replace(/Shift\+/g, '⇧');
}

function getIsDarkTheme(): boolean {
  const theme = useEditorStore.getState().appSettings.theme;
  return (
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

export async function openErmFile(): Promise<void> {
  const state = useEditorStore.getState();
  const lang = state.appSettings.language;

  try {
    if (!isTauriEnvironment() && typeof window !== 'undefined') {
      const fsWin = window as WindowWithFsAccess;
      if (typeof fsWin.showOpenFilePicker === 'function') {
        const handles = await fsWin.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'ERM-Editor Diagramm (.erm)',
              accept: { 'application/json': ['.erm', '.json'] },
            },
          ],
        });
        const handle = handles[0];
        if (!handle) return;
        const file = await handle.getFile();
        const content = await file.text();
        const doc = parseErmFile(content);
        state.loadDocumentInTab(doc, {
          fileHandle: handle,
          filePath: file.name,
          inNewTab: true,
        });
        state.addRecentFile({
          name: file.name,
          lastOpenedAt: new Date().toISOString(),
        });
        state.showToast(translate(lang, 'toast.openedFile', { name: file.name }), 'success');
        return;
      }
    }

    const adapter = getPlatformAdapter();
    const opened = await adapter.openFileDialog({
      title: translate(lang, 'menu.file.open'),
      filters: [{ name: 'ERM-Editor', extensions: ['erm', 'json'] }],
    });
    if (!opened) return;
    const doc = parseErmFile(opened.content);
    state.loadDocumentInTab(doc, {
      filePath: opened.path ?? opened.name,
      inNewTab: true,
    });
    state.addRecentFile({
      name: opened.name,
      ...(opened.path ? { path: opened.path } : {}),
      lastOpenedAt: new Date().toISOString(),
    });
    state.showToast(translate(lang, 'toast.openedFile', { name: opened.name }), 'success');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const message = err instanceof Error ? err.message : String(err);
    state.showToast(translate(lang, 'toast.invalidFile', { error: message }), 'error');
  }
}

export async function saveErmFile(saveAs = false): Promise<boolean> {
  const state = useEditorStore.getState();
  const tab = state.getActiveTab();
  const lang = state.appSettings.language;
  const content = serializeErmFile(tab.document);
  const baseName = (tab.document.name || 'diagram').replace(/[^\w\-äöüÄÖÜß ]+/g, '_');

  try {
    // 1. Browser File System Access API overwrite on Ctrl/Cmd+S
    if (!saveAs && !isTauriEnvironment() && tab.fileHandle) {
      const writable = await tab.fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      state.markSaved({ tabId: tab.tabId, fileHandle: tab.fileHandle });
      state.showToast(translate(lang, 'toast.saved'), 'success');
      return true;
    }

    // 2. Desktop Tauri direct overwrite on Ctrl/Cmd+S
    const adapter = getPlatformAdapter();
    if (!saveAs && tab.filePath && adapter.isDesktop && adapter.writeTextFile) {
      await adapter.writeTextFile(tab.filePath, content);
      state.markSaved({ tabId: tab.tabId, filePath: tab.filePath });
      state.showToast(translate(lang, 'toast.saved'), 'success');
      return true;
    }

    // 3. Browser File System Access API Save Picker
    if (!isTauriEnvironment() && typeof window !== 'undefined') {
      const fsWin = window as WindowWithFsAccess;
      if (typeof fsWin.showSaveFilePicker === 'function') {
        const handle = await fsWin.showSaveFilePicker({
          suggestedName: `${baseName}.erm`,
          types: [
            {
              description: 'ERM-Editor Diagramm (.erm)',
              accept: { 'application/json': ['.erm'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        const cleanName = handle.name.replace(/\.(erm|json)$/i, '');
        state.markSaved({
          tabId: tab.tabId,
          fileHandle: handle,
          filePath: handle.name,
          name: cleanName,
        });
        state.addRecentFile({
          name: handle.name,
          lastOpenedAt: new Date().toISOString(),
        });
        state.showToast(translate(lang, 'toast.saved'), 'success');
        return true;
      }
    }

    // 4. Fallback via PlatformAdapter (Tauri Save Dialog or Browser Blob Download)
    const savedPath = await adapter.saveFileDialog(content, {
      title: translate(lang, saveAs ? 'menu.file.saveAs' : 'menu.file.save'),
      defaultName: `${baseName}.erm`,
      ...(tab.filePath ? { defaultPath: tab.filePath } : {}),
      filters: [{ name: 'ERM-Editor', extensions: ['erm'] }],
      mimeType: 'application/json',
    });
    if (!savedPath) return false;
    const fileName = savedPath.split(/[/\\]/).pop() || `${baseName}.erm`;
    const cleanName = fileName.replace(/\.(erm|json)$/i, '');
    state.markSaved({
      tabId: tab.tabId,
      filePath: savedPath,
      name: cleanName,
    });
    state.addRecentFile({
      name: fileName,
      ...(adapter.isDesktop ? { path: savedPath } : {}),
      lastOpenedAt: new Date().toISOString(),
    });
    state.showToast(translate(lang, 'toast.saved'), 'success');
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    state.showToast(err instanceof Error ? err.message : String(err), 'error');
    return false;
  }
}

function reportExportError(err: unknown): void {
  const state = useEditorStore.getState();
  if (err instanceof DOMException && err.name === 'AbortError') return;
  state.showToast(err instanceof Error ? err.message : String(err), 'error');
}

export async function exportErmSvg(): Promise<void> {
  try {
    const state = useEditorStore.getState();
    const doc = state.getActiveTab().document;
    const lang = state.appSettings.language;
    const svg = renderErmToSvgString(doc, { darkMode: getIsDarkTheme(), padding: 40 });
    const baseName = (doc.name || 'erm-diagram').replace(/[^\w\-äöüÄÖÜß ]+/g, '_');
    const saved = await getPlatformAdapter().saveFileDialog(svg, {
      title: translate(lang, 'menu.file.exportSvg'),
      defaultName: `${baseName}.svg`,
      filters: [{ name: 'SVG', extensions: ['svg'] }],
      mimeType: 'image/svg+xml',
    });
    if (saved) {
      state.showToast(translate(lang, 'toast.exportedSvg'), 'success');
    }
  } catch (err) {
    reportExportError(err);
  }
}

export async function exportErmPng(scale: 1 | 2 | 3): Promise<void> {
  try {
    const state = useEditorStore.getState();
    const doc = state.getActiveTab().document;
    const lang = state.appSettings.language;
    const blob = await renderErmToPngBlob(doc, scale, { darkMode: getIsDarkTheme() });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const baseName = (doc.name || 'erm-diagram').replace(/[^\w\-äöüÄÖÜß ]+/g, '_');
    const saved = await getPlatformAdapter().exportBinaryFile(bytes, {
      title: translate(lang, 'menu.file.exportPng2x'),
      defaultName: `${baseName}-${scale}x.png`,
      filters: [{ name: 'PNG', extensions: ['png'] }],
      mimeType: 'image/png',
    });
    if (saved) {
      state.showToast(translate(lang, 'toast.exportedPng'), 'success');
    }
  } catch (err) {
    reportExportError(err);
  }
}

export async function exportErmSql(): Promise<void> {
  try {
    const state = useEditorStore.getState();
    const doc = state.getActiveTab().document;
    const lang = state.appSettings.language;
    const tables = deriveRelationalModel(doc);
    const sql = generateSqlFromRelationalModel(tables);
    const baseName = (doc.name || 'erm-schema').replace(/[^\w\-äöüÄÖÜß ]+/g, '_');
    const saved = await getPlatformAdapter().saveFileDialog(sql, {
      title: 'SQL-DDL',
      defaultName: `${baseName}.sql`,
      filters: [{ name: 'SQL', extensions: ['sql'] }],
      mimeType: 'text/sql',
    });
    if (saved) {
      state.showToast(translate(lang, 'toast.saved'), 'success');
    }
  } catch (err) {
    reportExportError(err);
  }
}

export async function takeErmScreenshot(): Promise<void> {
  const state = useEditorStore.getState();
  const doc = state.getActiveTab().document;
  const lang = state.appSettings.language;
  try {
    await copyErmScreenshotToClipboard(doc, getIsDarkTheme());
    state.showToast(translate(lang, 'toast.screenshotCopied'), 'success');
  } catch {
    state.showToast(translate(lang, 'toast.screenshotFailed'), 'error');
  }
}

interface MenuItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  label,
  shortcut,
  disabled = false,
  checked,
  onClick,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="w-full flex items-center justify-between gap-6 px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
  >
    <span className="flex items-center gap-2 min-w-0">
      <span className="w-4 flex items-center justify-center shrink-0">
        {checked ? <Check className="w-3.5 h-3.5" /> : null}
      </span>
      <span className="truncate">{label}</span>
    </span>
    {shortcut && (
      <span className="text-[11px] opacity-65 font-mono shrink-0">
        {formatShortcut(shortcut)}
      </span>
    )}
  </button>
);

const MenuDivider: React.FC = () => (
  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
);

export const MenuBar: React.FC<MenuBarProps> = ({
  onOpenSettings,
  onOpenPrint,
  onOpenHelp,
  onOpenUpdate,
}) => {
  const isDesktop = isTauriEnvironment();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [pngSubmenuOpen, setPngSubmenuOpen] = useState(false);
  const [recentSubmenuOpen, setRecentSubmenuOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const { t, language } = useTranslation();
  const appSettings = useEditorStore((s) => s.appSettings);
  const updateAppSettings = useEditorStore((s) => s.updateAppSettings);
  const activeTab = useEditorStore((s) => s.tabs.find((tab) => tab.tabId === s.activeTabId) ?? s.tabs[0]);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useEditorStore((s) => s.selectedEdgeIds);
  const clipboard = useEditorStore((s) => s.clipboard);
  const isRelationalSidebarOpen = useEditorStore((s) => s.isRelationalSidebarOpen);

  const newTab = useEditorStore((s) => s.newTab);
  const loadDemoDocument = useEditorStore((s) => s.loadDemoDocument);
  const loadDocumentInTab = useEditorStore((s) => s.loadDocumentInTab);
  const clearRecentFiles = useEditorStore((s) => s.clearRecentFiles);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const cutSelection = useEditorStore((s) => s.cutSelection);
  const copySelection = useEditorStore((s) => s.copySelection);
  const paste = useEditorStore((s) => s.paste);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);
  const selectAll = useEditorStore((s) => s.selectAll);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const setGridStyle = useEditorStore((s) => s.setGridStyle);
  const toggleSnapToGrid = useEditorStore((s) => s.toggleSnapToGrid);
  const setNotationMode = useEditorStore((s) => s.setNotationMode);
  const toggleRelationalSidebar = useEditorStore((s) => s.toggleRelationalSidebar);
  const showToast = useEditorStore((s) => s.showToast);

  const doc = activeTab?.document;
  const hasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;
  const canUndo = (activeTab?.undoStack.length ?? 0) > 0;
  const canRedo = (activeTab?.redoStack.length ?? 0) > 0;
  const isDark = getIsDarkTheme();

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setPngSubmenuOpen(false);
        setRecentSubmenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setPngSubmenuOpen(false);
        setRecentSubmenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const closeAndRun = (fn: () => void) => {
    setOpenMenu(null);
    setPngSubmenuOpen(false);
    setRecentSubmenuOpen(false);
    fn();
  };

  const handleOpenRecent = async (entry: { name: string; path?: string }) => {
    const adapter = getPlatformAdapter();
    if (!adapter.readFileByPath) return;
    const opened = await adapter.readFileByPath(entry.path ?? entry.name);
    if (!opened) {
      showToast(
        language === 'de'
          ? `Datei nicht mehr verfügbar: ${entry.name}`
          : `File no longer available: ${entry.name}`,
        'error',
      );
      return;
    }
    try {
      const parsed = parseErmFile(opened.content);
      loadDocumentInTab(parsed, {
        filePath: opened.path ?? opened.name,
        inNewTab: true,
      });
      showToast(t('toast.openedFile', { name: opened.name }), 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(t('toast.invalidFile', { error: msg }), 'error');
    }
  };

  const menuButtonCls = (key: MenuKey) =>
    `px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
      openMenu === key
        ? 'bg-blue-600 text-white'
        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800'
    }`;

  const dropdownCls =
    'absolute left-0 top-full mt-0.5 min-w-[240px] py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50';

  return (
    <header
      ref={barRef}
      className="flex items-center justify-between px-2 h-8 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 select-none"
    >
      <div className="flex items-center gap-1">
        {/* App Brand */}
        <div className="flex items-center gap-1.5 px-2 mr-1">
          <span className="w-2 h-2 rounded-xs bg-blue-600 inline-block" />
          <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('app.name')}
          </span>
        </div>

        {/* Datei / File */}
        <div className="relative">
          <button
            type="button"
            className={menuButtonCls('file')}
            onClick={() => setOpenMenu((m) => (m === 'file' ? null : 'file'))}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('file');
            }}
          >
            {t('menu.file')}
          </button>
          {openMenu === 'file' && (
            <div className={dropdownCls}>
              <MenuItem
                label={t('menu.file.new')}
                shortcut="Ctrl+N"
                onClick={() => closeAndRun(() => newTab())}
              />
              <MenuItem
                label={t('menu.file.open')}
                shortcut="Ctrl+O"
                onClick={() => closeAndRun(() => void openErmFile())}
              />
              {/* Recent files submenu */}
              <div
                className="relative"
                onMouseEnter={() => setRecentSubmenuOpen(true)}
                onMouseLeave={() => setRecentSubmenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setRecentSubmenuOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-4" />
                    <span>{t('menu.file.recent')}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
                {recentSubmenuOpen && (
                  <div className="absolute left-full top-0 ml-0.5 min-w-[220px] py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50">
                    {appSettings.recentFiles.length === 0 ? (
                      <div className="px-3 py-1.5 text-xs text-slate-400">
                        {t('menu.file.noRecent')}
                      </div>
                    ) : (
                      <>
                        {appSettings.recentFiles.map((entry) => (
                          <MenuItem
                            key={`${entry.name}-${entry.lastOpenedAt}`}
                            label={entry.name}
                            onClick={() => closeAndRun(() => void handleOpenRecent(entry))}
                          />
                        ))}
                        <MenuDivider />
                        <MenuItem
                          label={t('menu.file.clearRecent')}
                          onClick={() => closeAndRun(() => clearRecentFiles())}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
              <MenuItem
                label={t('menu.file.loadDemo')}
                onClick={() =>
                  closeAndRun(() => {
                    loadDemoDocument(language);
                    showToast(t('toast.loadedDemo'), 'success');
                  })
                }
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.file.save')}
                shortcut="Ctrl+S"
                onClick={() => closeAndRun(() => void saveErmFile(false))}
              />
              <MenuItem
                label={t('menu.file.saveAs')}
                shortcut="Ctrl+Shift+S"
                onClick={() => closeAndRun(() => void saveErmFile(true))}
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.file.exportSvg')}
                onClick={() => closeAndRun(() => void exportErmSvg())}
              />
              <div
                className="relative"
                onMouseEnter={() => setPngSubmenuOpen(true)}
                onMouseLeave={() => setPngSubmenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setPngSubmenuOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-4" />
                    <span>{language === 'de' ? 'Als PNG exportieren' : 'Export as PNG'}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
                {pngSubmenuOpen && (
                  <div className="absolute left-full top-0 ml-0.5 min-w-[180px] py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50">
                    <MenuItem
                      label={t('menu.file.exportPng1x')}
                      onClick={() => closeAndRun(() => void exportErmPng(1))}
                    />
                    <MenuItem
                      label={t('menu.file.exportPng2x')}
                      onClick={() => closeAndRun(() => void exportErmPng(2))}
                    />
                    <MenuItem
                      label={t('menu.file.exportPng3x')}
                      onClick={() => closeAndRun(() => void exportErmPng(3))}
                    />
                  </div>
                )}
              </div>
              <MenuItem
                label={t('menu.file.screenshot')}
                onClick={() => closeAndRun(() => void takeErmScreenshot())}
              />
              <MenuItem
                label={language === 'de' ? 'SQL-DDL exportieren…' : 'Export SQL-DDL…'}
                onClick={() => closeAndRun(() => void exportErmSql())}
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.file.print')}
                shortcut="Ctrl+P"
                onClick={() => closeAndRun(onOpenPrint)}
              />
            </div>
          )}
        </div>

        {/* Bearbeiten / Edit */}
        <div className="relative">
          <button
            type="button"
            className={menuButtonCls('edit')}
            onClick={() => setOpenMenu((m) => (m === 'edit' ? null : 'edit'))}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('edit');
            }}
          >
            {t('menu.edit')}
          </button>
          {openMenu === 'edit' && (
            <div className={dropdownCls}>
              <MenuItem
                label={t('menu.edit.undo')}
                shortcut="Ctrl+Z"
                disabled={!canUndo}
                onClick={() => closeAndRun(undo)}
              />
              <MenuItem
                label={t('menu.edit.redo')}
                shortcut="Ctrl+Shift+Z"
                disabled={!canRedo}
                onClick={() => closeAndRun(redo)}
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.edit.cut')}
                shortcut="Ctrl+X"
                disabled={selectedNodeIds.length === 0}
                onClick={() => closeAndRun(cutSelection)}
              />
              <MenuItem
                label={t('menu.edit.copy')}
                shortcut="Ctrl+C"
                disabled={selectedNodeIds.length === 0}
                onClick={() => closeAndRun(copySelection)}
              />
              <MenuItem
                label={t('menu.edit.paste')}
                shortcut="Ctrl+V"
                disabled={!clipboard || clipboard.nodes.length === 0}
                onClick={() => closeAndRun(() => paste())}
              />
              <MenuItem
                label={t('menu.edit.delete')}
                shortcut="Del"
                disabled={!hasSelection}
                onClick={() => closeAndRun(deleteSelection)}
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.edit.selectAll')}
                shortcut="Ctrl+A"
                onClick={() => closeAndRun(selectAll)}
              />
            </div>
          )}
        </div>

        {/* Ansicht / View */}
        <div className="relative">
          <button
            type="button"
            className={menuButtonCls('view')}
            onClick={() => setOpenMenu((m) => (m === 'view' ? null : 'view'))}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('view');
            }}
          >
            {t('menu.view')}
          </button>
          {openMenu === 'view' && doc && (
            <div className={dropdownCls}>
              <MenuItem
                label={t('menu.view.zoomIn')}
                shortcut="Ctrl++"
                onClick={() => closeAndRun(() => setZoom(doc.zoom + 0.15))}
              />
              <MenuItem
                label={t('menu.view.zoomOut')}
                shortcut="Ctrl+-"
                onClick={() => closeAndRun(() => setZoom(doc.zoom - 0.15))}
              />
              <MenuItem
                label={t('menu.view.zoomReset')}
                shortcut="Ctrl+0"
                onClick={() =>
                  closeAndRun(() => {
                    setZoom(1);
                    setPan(0, 0);
                  })
                }
              />
              <MenuDivider />
              <MenuItem
                label={
                  appSettings.language === 'de'
                    ? `Programmoberfläche vergrößern (${Math.round((appSettings.uiScale ?? 1) * 100)}%)`
                    : `Zoom UI In (${Math.round((appSettings.uiScale ?? 1) * 100)}%)`
                }
                onClick={() =>
                  closeAndRun(() =>
                    updateAppSettings({
                      uiScale: Math.min(1.4, Number(((appSettings.uiScale ?? 1) + 0.1).toFixed(2))),
                    }),
                  )
                }
              />
              <MenuItem
                label={
                  appSettings.language === 'de'
                    ? 'Programmoberfläche verkleinern'
                    : 'Zoom UI Out'
                }
                onClick={() =>
                  closeAndRun(() =>
                    updateAppSettings({
                      uiScale: Math.max(0.8, Number(((appSettings.uiScale ?? 1) - 0.1).toFixed(2))),
                    }),
                  )
                }
              />
              <MenuItem
                label={
                  appSettings.language === 'de'
                    ? 'Programmoberfläche 100%'
                    : 'Reset UI Scale (100%)'
                }
                onClick={() => closeAndRun(() => updateAppSettings({ uiScale: 1 }))}
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.view.grid')}
                checked={doc.showGrid}
                onClick={() => closeAndRun(toggleGrid)}
              />
              <MenuItem
                label={t('menu.view.gridDots')}
                checked={doc.gridStyle === 'dots'}
                onClick={() => closeAndRun(() => setGridStyle('dots'))}
              />
              <MenuItem
                label={t('menu.view.gridLines')}
                checked={doc.gridStyle === 'grid'}
                onClick={() => closeAndRun(() => setGridStyle('grid'))}
              />
              <MenuItem
                label={t('menu.view.snapToGrid')}
                checked={doc.snapToGrid}
                onClick={() => closeAndRun(toggleSnapToGrid)}
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.view.notationChen')}
                checked={doc.notationMode === 'chen'}
                onClick={() => closeAndRun(() => setNotationMode('chen'))}
              />
              <MenuItem
                label={t('menu.view.notationMinMax')}
                checked={doc.notationMode === 'minmax'}
                onClick={() => closeAndRun(() => setNotationMode('minmax'))}
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.view.relationalSidebar')}
                checked={isRelationalSidebarOpen}
                onClick={() => closeAndRun(toggleRelationalSidebar)}
              />
              <MenuItem
                label={t('menu.view.darkMode')}
                checked={isDark}
                onClick={() =>
                  closeAndRun(() =>
                    updateAppSettings({ theme: isDark ? 'light' : 'dark' }),
                  )
                }
              />
              <MenuDivider />
              <MenuItem
                label={t('menu.view.settings')}
                shortcut="Ctrl+,"
                onClick={() => closeAndRun(onOpenSettings)}
              />
            </div>
          )}
        </div>

        {/* Hilfe / Help */}
        <div className="relative">
          <button
            type="button"
            className={menuButtonCls('help')}
            onClick={() => setOpenMenu((m) => (m === 'help' ? null : 'help'))}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('help');
            }}
          >
            {t('menu.help')}
          </button>
          {openMenu === 'help' && (
            <div className={dropdownCls}>
              <MenuItem
                label={t('menu.help.shortcuts')}
                shortcut="F1"
                onClick={() => closeAndRun(() => onOpenHelp('shortcuts'))}
              />
              <MenuItem
                label={t('help.tabLegend')}
                onClick={() => closeAndRun(() => onOpenHelp('legend'))}
              />
              <MenuItem
                label="Download (macOS / Windows)"
                onClick={() => closeAndRun(() => onOpenHelp('download'))}
              />
              {isDesktop && onOpenUpdate && (
                <>
                  <MenuDivider />
                  <MenuItem
                    label={t('menu.help.checkUpdates')}
                    onClick={() => closeAndRun(onOpenUpdate)}
                  />
                </>
              )}
              <MenuDivider />
              <MenuItem
                label={`${t('menu.help.about')} / ${t('menu.help.imprint')}`}
                onClick={() => closeAndRun(() => onOpenHelp('imprint'))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right quick hint */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pr-1">
        <span>{doc?.notationMode === 'chen' ? 'Chen' : 'Min-Max'}</span>
      </div>
    </header>
  );
};
