import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { HelpModal, type HelpTab } from './components/HelpModal';
import { LandingPage } from './components/LandingPage';
import {
  MenuBar,
  exportErmSql,
  openErmFile,
  saveErmFile,
} from './components/MenuBar';
import { PrintModal } from './components/PrintModal';
import { ProjectTabs } from './components/ProjectTabs';
import { RelationalSidebar } from './components/RelationalSidebar';
import { SeoSubPage, type SeoPageRoute } from './components/SeoPages';
import { SettingsModal } from './components/SettingsModal';
import { StatusBar } from './components/StatusBar';
import { Toolbar } from './components/Toolbar';
import { UpdateModal } from './components/UpdateModal';
import { WorkspaceCanvas } from './components/WorkspaceCanvas';
import { isTauriEnvironment } from './platform/adapter';
import { useEditorStore } from './store/editorStore';

const SEO_ROUTES: SeoPageRoute[] = [
  '/chen-notation',
  '/relationenmodell',
  '/yed-alternative',
  '/faq',
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export const App: React.FC = () => {
  const loadAppSettings = useEditorStore((s) => s.loadAppSettings);
  const themeSetting = useEditorStore((s) => s.appSettings.theme);
  const toast = useEditorStore((s) => s.toast);
  const clearToast = useEditorStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const delay = toast.type === 'error' ? 4500 : 2800;
    const timer = window.setTimeout(() => {
      clearToast();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<HelpTab>('legend');
  const [updateOpen, setUpdateOpen] = useState(false);

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (isTauriEnvironment() || typeof window === 'undefined') return '/app';
    if (window.location.hash === '#app') return '/app';
    return window.location.pathname || '/';
  });

  useEffect(() => {
    if (isTauriEnvironment()) return;
    const onPopState = () => {
      setCurrentPath(
        window.location.hash === '#app' ? '/app' : window.location.pathname || '/',
      );
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((path: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  }, []);

  const handleLaunchEditor = useCallback(() => {
    navigateTo('/app');
  }, [navigateTo]);

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    void loadAppSettings();
  }, [loadAppSettings]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark =
    themeSetting === 'dark' || (themeSetting === 'system' && systemDark);
  const themeClass = isDark ? 'dark' : 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(themeClass);
  }, [themeClass]);

  // Warn before closing browser tab or Tauri desktop window with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = useEditorStore.getState().tabs.some((tab) => tab.isDirty);
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    let unlistenClose: (() => void) | undefined;
    if (isTauriEnvironment()) {
      void import('@tauri-apps/api/event').then(async ({ listen }) => {
        const { invoke } = await import('@tauri-apps/api/core');
        unlistenClose = await listen('app-close-requested', () => {
          const state = useEditorStore.getState();
          const hasDirty = state.tabs.some((tab) => tab.isDirty);
          if (hasDirty) {
            const msg =
              state.appSettings.language === 'de'
                ? 'Es gibt ungespeicherte Änderungen. App trotzdem schließen?'
                : 'You have unsaved changes. Quit anyway?';
            if (!window.confirm(msg)) {
              return;
            }
          }
          void invoke('confirm_close');
        });
      });
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unlistenClose?.();
    };
  }, []);

  // Listen to native macOS menu bar events in Tauri desktop app
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;

    void import('@tauri-apps/api/event').then(async ({ listen }) => {
      unlisten = await listen<string>('menu-action', (event) => {
        const state = useEditorStore.getState();
        const doc = state.getActiveTab().document;

        switch (event.payload) {
          case 'file-new':
            state.newTab();
            break;
          case 'file-open':
            void openErmFile();
            break;
          case 'file-save':
            void saveErmFile(false);
            break;
          case 'file-save-as':
            void saveErmFile(true);
            break;
          case 'file-export-sql':
            void exportErmSql();
            break;
          case 'file-print':
            setPrintOpen(true);
            break;
          case 'edit-undo':
            state.undo();
            break;
          case 'edit-redo':
            state.redo();
            break;
          case 'view-zoom-in':
            state.setZoom(doc.zoom + 0.15);
            break;
          case 'view-zoom-out':
            state.setZoom(doc.zoom - 0.15);
            break;
          case 'view-reset':
            state.setZoom(1);
            state.setPan(0, 0);
            break;
          case 'view-auto-layout':
            if (state.selectedNodeIds.length === 1) {
              state.autoLayoutNodeAttributes(state.selectedNodeIds[0]);
            }
            break;
          case 'options-settings':
            setSettingsOpen(true);
            break;
          case 'help-shortcuts':
            setHelpTab('shortcuts');
            setHelpOpen(true);
            break;
          case 'help-download':
            setHelpTab('download');
            setHelpOpen(true);
            break;
          case 'app-update':
          case 'help-update':
            setUpdateOpen(true);
            break;
          case 'app-about':
          case 'help-about':
            setHelpTab('imprint');
            setHelpOpen(true);
            break;
        }
      });
    });

    return () => {
      unlisten?.();
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useEditorStore.getState();

      if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false);
        if (printOpen) setPrintOpen(false);
        if (helpOpen) setHelpOpen(false);
        if (updateOpen) setUpdateOpen(false);
        if (state.activeTool !== 'select') state.setActiveTool('select');
        if (state.editingNodeId !== null) state.setEditingNodeId(null);
        return;
      }

      if (state.editingNodeId !== null || isEditableTarget(e.target)) {
        return;
      }

      if (settingsOpen || printOpen || helpOpen || updateOpen) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          state.redo();
        } else {
          state.undo();
        }
        return;
      }

      if (mod && key === 'y') {
        e.preventDefault();
        state.redo();
        return;
      }

      if (mod && key === 'c') {
        if (state.selectedNodeIds.length > 0) {
          e.preventDefault();
          state.copySelection();
        }
        return;
      }

      if (mod && key === 'x') {
        if (state.selectedNodeIds.length > 0) {
          e.preventDefault();
          state.cutSelection();
        }
        return;
      }

      if (mod && key === 'v') {
        if (state.clipboard && state.clipboard.nodes.length > 0) {
          e.preventDefault();
          state.paste();
        }
        return;
      }

      if (mod && key === 'a') {
        e.preventDefault();
        state.selectAll();
        return;
      }

      if (mod && key === 's') {
        e.preventDefault();
        void saveErmFile(e.shiftKey);
        return;
      }

      if (mod && key === 'o') {
        e.preventDefault();
        void openErmFile();
        return;
      }

      if (mod && key === 'n') {
        e.preventDefault();
        state.newTab();
        return;
      }

      if (mod && key === 'p') {
        e.preventDefault();
        setPrintOpen(true);
        return;
      }

      if (mod && key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }

      if (mod && (key === '=' || key === '+')) {
        e.preventDefault();
        state.setZoom(state.getActiveTab().document.zoom + 0.15);
        return;
      }

      if (mod && key === '-') {
        e.preventDefault();
        state.setZoom(state.getActiveTab().document.zoom - 0.15);
        return;
      }

      if (mod && key === '0') {
        e.preventDefault();
        state.setZoom(1);
        state.setPan(0, 0);
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setHelpTab('shortcuts');
        setHelpOpen(true);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedNodeIds.length > 0 || state.selectedEdgeIds.length > 0) {
          e.preventDefault();
          state.deleteSelection();
        }
        return;
      }

      if (!mod && !e.altKey && !e.shiftKey) {
        if (key === 'v') {
          state.setActiveTool('select');
        } else if (key === 'e') {
          state.setActiveTool('entity');
        } else if (key === 'r') {
          state.setActiveTool('relationship');
        } else if (key === 'a') {
          state.setActiveTool('attribute');
        } else if (key === 'c') {
          state.setActiveTool('connect');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen, printOpen, helpOpen, updateOpen]);

  // Browser routing: SEO subpages and LandingPage (Tauri ALWAYS opens directly in Editor)
  if (!isTauriEnvironment() && SEO_ROUTES.includes(currentPath as SeoPageRoute)) {
    return (
      <div className={themeClass}>
        <SeoSubPage
          route={currentPath as SeoPageRoute}
          onNavigate={navigateTo}
          onLaunchEditor={handleLaunchEditor}
          onOpenImprint={() => {
            setHelpTab('imprint');
            setHelpOpen(true);
          }}
        />
        <HelpModal
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          initialTab={helpTab}
        />
      </div>
    );
  }

  if (!isTauriEnvironment() && currentPath !== '/app') {
    return (
      <div className={themeClass}>
        <LandingPage
          onLaunchEditor={handleLaunchEditor}
          onNavigate={navigateTo}
          onOpenImprint={() => {
            setHelpTab('imprint');
            setHelpOpen(true);
          }}
        />
        <HelpModal
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          initialTab={helpTab}
        />
      </div>
    );
  }

  return (
    <div
      className={`${themeClass} h-screen w-screen flex flex-col overflow-hidden select-none ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Application Chrome */}
      <div className="no-print shrink-0">
        <MenuBar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenPrint={() => setPrintOpen(true)}
          onOpenHelp={(tab = 'legend') => {
            setHelpTab(tab);
            setHelpOpen(true);
          }}
          onOpenUpdate={() => setUpdateOpen(true)}
        />
        <ProjectTabs />
        <Toolbar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenPrint={() => setPrintOpen(true)}
        />
      </div>

      {/* Main 2D Workspace + Relational Model Sidebar */}
      <div className="no-print flex-1 min-h-0 relative flex flex-row">
        <div className="flex-1 min-w-0 h-full relative">
          <WorkspaceCanvas darkMode={isDark} />

          {toast && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-medium shadow-lg border border-slate-700">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={clearToast}
                className="p-0.5 rounded hover:bg-slate-700 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <RelationalSidebar />
      </div>

      {/* Bottom Status Bar */}
      <div className="no-print shrink-0">
        <StatusBar />
      </div>

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PrintModal isOpen={printOpen} onClose={() => setPrintOpen(false)} />
      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialTab={helpTab}
      />
      <UpdateModal isOpen={updateOpen} onClose={() => setUpdateOpen(false)} />
    </div>
  );
};

export default App;
