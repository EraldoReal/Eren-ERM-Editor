import { create } from 'zustand';
import { autoLayoutAttributesForNode } from '../engine/autoLayout.ts';
import {
  DEFAULT_APP_SETTINGS,
  GRID_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  createDefaultEdge,
  createDefaultNode,
  createEmptyDocument,
  createId,
} from '../model/defaults.ts';
import { getDemoErmDocument } from '../model/demoErm.ts';
import type {
  AppSettings,
  ErmCardinality,
  ErmDocument,
  ErmEdge,
  ErmNode,
  ErmNodeStyle,
  ErmNodeType,
  GridStyle,
  LanguageCode,
  NotationMode,
  RecentFileEntry,
} from '../model/types.ts';
import { getPlatformAdapter } from '../platform/adapter.ts';

export type EditorTool = 'select' | 'entity' | 'relationship' | 'attribute' | 'connect';

export type AttributeFlag = 'isPrimaryKey' | 'isForeignKey' | 'isMultivalued' | 'isDerived';

export interface ProjectTab {
  tabId: string;
  document: ErmDocument;
  filePath: string | null;
  fileHandle: FileSystemFileHandle | null;
  isDirty: boolean;
  undoStack: ErmDocument[];
  redoStack: ErmDocument[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface ClipboardData {
  nodes: ErmNode[];
  edges: ErmEdge[];
}

export interface NodeMove {
  id: string;
  x: number;
  y: number;
}

export interface EditorState {
  tabs: ProjectTab[];
  activeTabId: string;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  activeTool: EditorTool;
  clipboard: ClipboardData | null;
  editingNodeId: string | null;
  isRelationalSidebarOpen: boolean;
  appSettings: AppSettings;
  toast: ToastMessage | null;

  // Derived helper
  getActiveTab: () => ProjectTab;

  // Tab management
  newTab: (options?: { name?: string }) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  loadDocumentInTab: (
    doc: ErmDocument,
    meta?: {
      filePath?: string | null;
      fileHandle?: FileSystemFileHandle | null;
      inNewTab?: boolean;
    },
  ) => string;
  loadDemoDocument: (language?: LanguageCode) => string;
  renameDocument: (name: string) => void;

  // Selection & interaction
  setSelection: (nodeIds: string[], edgeIds?: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setRelationalSidebarOpen: (open: boolean) => void;
  toggleRelationalSidebar: () => void;

  // Node CRUD
  addNode: (type: ErmNodeType, x: number, y: number, label?: string) => ErmNode;
  moveNodes: (moves: NodeMove[], pushUndo?: boolean) => void;
  resizeNode: (
    id: string,
    width: number,
    height: number,
    x?: number,
    y?: number,
    pushUndo?: boolean,
  ) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeStyle: (id: string, style: Partial<ErmNodeStyle>) => void;
  toggleWeakEntity: (id: string) => void;
  toggleIdentifyingRelationship: (id: string) => void;
  toggleAttributeFlag: (id: string, flag: AttributeFlag) => void;
  autoLayoutNodeAttributes: (centerNodeId: string) => void;

  // Edge CRUD
  addEdge: (
    sourceId: string,
    targetId: string,
    cardinality?: ErmCardinality,
    role?: string,
  ) => ErmEdge | null;
  updateEdge: (
    id: string,
    patch: Partial<Pick<ErmEdge, 'cardinality' | 'role' | 'isTotalParticipation'>>,
  ) => void;
  deleteSelection: () => void;

  // Notation & View controls
  setNotationMode: (mode: NotationMode) => void;
  toggleNotationMode: () => void;
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  toggleGrid: () => void;
  setGridStyle: (style: GridStyle) => void;
  toggleSnapToGrid: () => void;

  // History
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // Clipboard
  copySelection: () => void;
  cutSelection: () => void;
  paste: (offsetX?: number, offsetY?: number) => void;

  // Save state
  markSaved: (meta?: {
    tabId?: string;
    filePath?: string | null;
    fileHandle?: FileSystemFileHandle | null;
    name?: string;
  }) => void;

  // App settings & recent files
  updateAppSettings: (patch: Partial<AppSettings>) => void;
  loadAppSettings: () => Promise<void>;
  addRecentFile: (entry: RecentFileEntry) => void;
  clearRecentFiles: () => void;

  // Toast
  showToast: (message: string, type?: ToastMessage['type']) => void;
  clearToast: () => void;
}

const MAX_UNDO_STACK = 100;
const MAX_RECENT_FILES = 10;
const ROLE_EDIT_COALESCE_MS = 1500;
let lastRoleEdit: { edgeId: string; time: number } | null = null;
const MIN_NODE_WIDTH = 40;
const MIN_NODE_HEIGHT = 28;

function cloneDocument(doc: ErmDocument): ErmDocument {
  return {
    ...doc,
    nodes: doc.nodes.map((n) => ({
      ...n,
      ...(n.style ? { style: { ...n.style } } : {}),
    })),
    edges: doc.edges.map((e) => ({ ...e })),
  };
}

function snapCoordinate(value: number, snapToGrid: boolean): number {
  if (!snapToGrid) return value;
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function isValidConnectionTypes(a: ErmNodeType, b: ErmNodeType): boolean {
  if (a === 'entity' && b === 'relationship') return true;
  if (a === 'relationship' && b === 'entity') return true;
  if (a === 'entity' && b === 'attribute') return true;
  if (a === 'attribute' && b === 'entity') return true;
  if (a === 'relationship' && b === 'attribute') return true;
  if (a === 'attribute' && b === 'relationship') return true;
  return false;
}

function createProjectTab(
  doc: ErmDocument,
  meta?: {
    filePath?: string | null;
    fileHandle?: FileSystemFileHandle | null;
  },
): ProjectTab {
  return {
    tabId: createId('tab'),
    document: doc,
    filePath: meta?.filePath ?? null,
    fileHandle: meta?.fileHandle ?? null,
    isDirty: false,
    undoStack: [],
    redoStack: [],
  };
}

function createDefaultTabFromSettings(settings: AppSettings, name?: string): ProjectTab {
  const doc = createEmptyDocument(name, {
    notationMode: settings.defaultNotationMode,
    showGrid: settings.defaultShowGrid,
    gridStyle: settings.defaultGridStyle,
    snapToGrid: settings.defaultSnapToGrid,
  });
  return createProjectTab(doc);
}

/** Undo/redo must not move the viewport: keep the current zoom and pan. */
function keepViewport(restored: ErmDocument, current: ErmDocument): ErmDocument {
  return { ...restored, zoom: current.zoom, panX: current.panX, panY: current.panY };
}

function pushToUndo(stack: ErmDocument[], doc: ErmDocument): ErmDocument[] {
  const next = [...stack, cloneDocument(doc)];
  if (next.length > MAX_UNDO_STACK) {
    return next.slice(next.length - MAX_UNDO_STACK);
  }
  return next;
}

function updateActiveTab(
  state: EditorState,
  updater: (tab: ProjectTab) => ProjectTab,
): Partial<EditorState> {
  return {
    tabs: state.tabs.map((tab) => (tab.tabId === state.activeTabId ? updater(tab) : tab)),
  };
}

function persistSettingsSafe(settings: AppSettings): void {
  try {
    void getPlatformAdapter().saveSettings(settings).catch(() => {
      // Ignore storage errors in restricted environments
    });
  } catch {
    // Ignore adapter initialization errors in tests
  }
}

const initialTab = createDefaultTabFromSettings(DEFAULT_APP_SETTINGS);

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.tabId,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  activeTool: 'select',
  clipboard: null,
  editingNodeId: null,
  isRelationalSidebarOpen: true,
  appSettings: { ...DEFAULT_APP_SETTINGS },
  toast: null,

  getActiveTab: () => {
    const state = get();
    return state.tabs.find((t) => t.tabId === state.activeTabId) ?? state.tabs[0];
  },

  newTab: (options) => {
    const { appSettings } = get();
    const tab = createDefaultTabFromSettings(appSettings, options?.name);
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.tabId,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      editingNodeId: null,
    }));
    return tab.tabId;
  },

  closeTab: (tabId) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.tabId === tabId);
      if (idx === -1) return state;

      if (state.tabs.length === 1) {
        const replacement = createDefaultTabFromSettings(state.appSettings);
        return {
          tabs: [replacement],
          activeTabId: replacement.tabId,
          selectedNodeIds: [],
          selectedEdgeIds: [],
          editingNodeId: null,
        };
      }

      const nextTabs = state.tabs.filter((t) => t.tabId !== tabId);
      let nextActiveTabId = state.activeTabId;
      if (state.activeTabId === tabId) {
        const fallbackIdx = Math.min(idx, nextTabs.length - 1);
        nextActiveTabId = nextTabs[fallbackIdx].tabId;
      }

      return {
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        editingNodeId: null,
      };
    });
  },

  setActiveTab: (tabId) => {
    set((state) => {
      if (state.activeTabId === tabId) return state;
      if (!state.tabs.some((t) => t.tabId === tabId)) return state;
      return {
        activeTabId: tabId,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        editingNodeId: null,
      };
    });
  },

  loadDocumentInTab: (doc, meta) => {
    const cloned = cloneDocument(doc);
    let targetTabId = '';
    set((state) => {
      const active = state.tabs.find((t) => t.tabId === state.activeTabId);
      const canReuseActive =
        meta?.inNewTab !== true &&
        active !== undefined &&
        !active.isDirty &&
        active.filePath === null &&
        active.document.nodes.length === 0 &&
        active.document.edges.length === 0;

      if (canReuseActive && active) {
        targetTabId = active.tabId;
        return {
          tabs: state.tabs.map((t) =>
            t.tabId === active.tabId
              ? {
                  ...t,
                  document: cloned,
                  filePath: meta?.filePath ?? null,
                  fileHandle: meta?.fileHandle ?? null,
                  isDirty: false,
                  undoStack: [],
                  redoStack: [],
                }
              : t,
          ),
          selectedNodeIds: [],
          selectedEdgeIds: [],
          editingNodeId: null,
        };
      }

      const newProjectTab = createProjectTab(cloned, {
        filePath: meta?.filePath ?? null,
        fileHandle: meta?.fileHandle ?? null,
      });
      targetTabId = newProjectTab.tabId;
      return {
        tabs: [...state.tabs, newProjectTab],
        activeTabId: newProjectTab.tabId,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        editingNodeId: null,
      };
    });
    return targetTabId;
  },

  loadDemoDocument: (language) => {
    const lang = language ?? get().appSettings.language;
    const demo = getDemoErmDocument(lang);
    return get().loadDocumentInTab(demo, {
      filePath: null,
      fileHandle: null,
    });
  },

  renameDocument: (name) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        if (tab.document.name === name) return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: { ...tab.document, name },
        };
      }),
    );
  },

  setSelection: (nodeIds, edgeIds = []) => {
    set({
      selectedNodeIds: [...nodeIds],
      selectedEdgeIds: [...edgeIds],
    });
  },

  selectAll: () => {
    const active = get().getActiveTab();
    set({
      selectedNodeIds: active.document.nodes.map((n) => n.id),
      selectedEdgeIds: active.document.edges.map((e) => e.id),
    });
  },

  clearSelection: () => {
    set({
      selectedNodeIds: [],
      selectedEdgeIds: [],
      editingNodeId: null,
    });
  },

  setActiveTool: (tool) => {
    set({ activeTool: tool });
  },

  setEditingNodeId: (nodeId) => {
    set({ editingNodeId: nodeId });
  },

  setRelationalSidebarOpen: (open) => {
    set({ isRelationalSidebarOpen: open });
  },

  toggleRelationalSidebar: () => {
    set((state) => ({ isRelationalSidebarOpen: !state.isRelationalSidebarOpen }));
  },

  addNode: (type, x, y, label) => {
    const active = get().getActiveTab();
    const snappedX = snapCoordinate(x, active.document.snapToGrid);
    const snappedY = snapCoordinate(y, active.document.snapToGrid);
    const node = createDefaultNode(type, snappedX, snappedY, label);

    set((state) => ({
      ...updateActiveTab(state, (tab) => ({
        ...tab,
        undoStack: pushToUndo(tab.undoStack, tab.document),
        redoStack: [],
        isDirty: true,
        document: {
          ...tab.document,
          nodes: [...tab.document.nodes, node],
        },
      })),
      selectedNodeIds: [node.id],
      selectedEdgeIds: [],
    }));

    return node;
  },

  moveNodes: (moves, pushUndo = true) => {
    if (moves.length === 0) return;
    const moveMap = new Map(moves.map((m) => [m.id, m]));

    set((state) =>
      updateActiveTab(state, (tab) => {
        let changed = false;
        const nextNodes = tab.document.nodes.map((node) => {
          const move = moveMap.get(node.id);
          if (!move || (move.x === node.x && move.y === node.y)) {
            return node;
          }
          changed = true;
          return { ...node, x: move.x, y: move.y };
        });

        if (!changed) return tab;

        return {
          ...tab,
          undoStack: pushUndo ? pushToUndo(tab.undoStack, tab.document) : tab.undoStack,
          redoStack: pushUndo ? [] : tab.redoStack,
          isDirty: true,
          document: {
            ...tab.document,
            nodes: nextNodes,
          },
        };
      }),
    );
  },

  resizeNode: (id, width, height, x, y, pushUndo = true) => {
    const clampedWidth = Math.max(MIN_NODE_WIDTH, width);
    const clampedHeight = Math.max(MIN_NODE_HEIGHT, height);

    set((state) =>
      updateActiveTab(state, (tab) => {
        const target = tab.document.nodes.find((n) => n.id === id);
        if (!target) return tab;
        const nextX = x ?? target.x;
        const nextY = y ?? target.y;
        if (
          target.width === clampedWidth &&
          target.height === clampedHeight &&
          target.x === nextX &&
          target.y === nextY
        ) {
          return tab;
        }
        return {
          ...tab,
          undoStack: pushUndo ? pushToUndo(tab.undoStack, tab.document) : tab.undoStack,
          redoStack: pushUndo ? [] : tab.redoStack,
          isDirty: true,
          document: {
            ...tab.document,
            nodes: tab.document.nodes.map((n) =>
              n.id === id
                ? { ...n, width: clampedWidth, height: clampedHeight, x: nextX, y: nextY }
                : n,
            ),
          },
        };
      }),
    );
  },

  updateNodeLabel: (id, label) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        const target = tab.document.nodes.find((n) => n.id === id);
        if (!target || target.label === label) return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: {
            ...tab.document,
            nodes: tab.document.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
          },
        };
      }),
    );
  },

  updateNodeStyle: (id, style) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        const target = tab.document.nodes.find((n) => n.id === id);
        if (!target) return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: {
            ...tab.document,
            nodes: tab.document.nodes.map((n) =>
              n.id === id ? { ...n, style: { ...n.style, ...style } } : n,
            ),
          },
        };
      }),
    );
  },

  toggleWeakEntity: (id) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        const target = tab.document.nodes.find((n) => n.id === id);
        if (!target || target.type !== 'entity') return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: {
            ...tab.document,
            nodes: tab.document.nodes.map((n) =>
              n.id === id ? { ...n, isWeak: !n.isWeak } : n,
            ),
          },
        };
      }),
    );
  },

  toggleIdentifyingRelationship: (id) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        const target = tab.document.nodes.find((n) => n.id === id);
        if (!target || target.type !== 'relationship') return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: {
            ...tab.document,
            nodes: tab.document.nodes.map((n) =>
              n.id === id ? { ...n, isIdentifying: !n.isIdentifying } : n,
            ),
          },
        };
      }),
    );
  },

  toggleAttributeFlag: (id, flag) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        const target = tab.document.nodes.find((n) => n.id === id);
        if (!target || target.type !== 'attribute') return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: {
            ...tab.document,
            nodes: tab.document.nodes.map((n) =>
              n.id === id ? { ...n, [flag]: !n[flag] } : n,
            ),
          },
        };
      }),
    );
  },

  autoLayoutNodeAttributes: (centerNodeId) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        const nextDoc = autoLayoutAttributesForNode(tab.document, centerNodeId);
        if (nextDoc === tab.document) return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: nextDoc,
        };
      }),
    );
  },

  addEdge: (sourceId, targetId, cardinality = '', role) => {
    if (sourceId === targetId) return null;
    const active = get().getActiveTab();
    const sourceNode = active.document.nodes.find((n) => n.id === sourceId);
    const targetNode = active.document.nodes.find((n) => n.id === targetId);
    if (!sourceNode || !targetNode) return null;
    if (!isValidConnectionTypes(sourceNode.type, targetNode.type)) return null;

    const alreadyExists = active.document.edges.some(
      (e) =>
        (e.sourceId === sourceId && e.targetId === targetId) ||
        (e.sourceId === targetId && e.targetId === sourceId),
    );
    if (alreadyExists) return null;

    const defaultCardinality: ErmCardinality =
      sourceNode.type === 'attribute' || targetNode.type === 'attribute' ? '' : cardinality;
    const edge = createDefaultEdge(sourceId, targetId, defaultCardinality);
    if (role !== undefined && role.length > 0) {
      edge.role = role;
    }

    set((state) => ({
      ...updateActiveTab(state, (tab) => ({
        ...tab,
        undoStack: pushToUndo(tab.undoStack, tab.document),
        redoStack: [],
        isDirty: true,
        document: {
          ...tab.document,
          edges: [...tab.document.edges, edge],
        },
      })),
      selectedNodeIds: [],
      selectedEdgeIds: [edge.id],
    }));

    return edge;
  },

  updateEdge: (id, patch) => {
    // Typing a role fires one update per keystroke; merge rapid edits of the same
    // edge's role into a single undo step instead of flooding the undo stack.
    const keys = Object.keys(patch);
    const isRoleOnly = keys.length === 1 && keys[0] === 'role';
    const now = Date.now();
    const coalesce =
      isRoleOnly &&
      lastRoleEdit !== null &&
      lastRoleEdit.edgeId === id &&
      now - lastRoleEdit.time < ROLE_EDIT_COALESCE_MS;
    lastRoleEdit = isRoleOnly ? { edgeId: id, time: now } : null;

    set((state) =>
      updateActiveTab(state, (tab) => {
        const target = tab.document.edges.find((e) => e.id === id);
        if (!target) return tab;
        return {
          ...tab,
          undoStack: coalesce ? tab.undoStack : pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: {
            ...tab.document,
            edges: tab.document.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          },
        };
      }),
    );
  },

  deleteSelection: () => {
    set((state) => {
      if (state.selectedNodeIds.length === 0 && state.selectedEdgeIds.length === 0) {
        return state;
      }
      const nodeSet = new Set(state.selectedNodeIds);
      const edgeSet = new Set(state.selectedEdgeIds);

      return {
        ...updateActiveTab(state, (tab) => {
          const nextNodes = tab.document.nodes.filter((n) => !nodeSet.has(n.id));
          const nextEdges = tab.document.edges.filter(
            (e) =>
              !edgeSet.has(e.id) && !nodeSet.has(e.sourceId) && !nodeSet.has(e.targetId),
          );

          if (
            nextNodes.length === tab.document.nodes.length &&
            nextEdges.length === tab.document.edges.length
          ) {
            return tab;
          }

          return {
            ...tab,
            undoStack: pushToUndo(tab.undoStack, tab.document),
            redoStack: [],
            isDirty: true,
            document: {
              ...tab.document,
              nodes: nextNodes,
              edges: nextEdges,
            },
          };
        }),
        selectedNodeIds: [],
        selectedEdgeIds: [],
        editingNodeId:
          state.editingNodeId && nodeSet.has(state.editingNodeId) ? null : state.editingNodeId,
      };
    });
  },

  setNotationMode: (mode) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        if (tab.document.notationMode === mode) return tab;
        return {
          ...tab,
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: [],
          isDirty: true,
          document: {
            ...tab.document,
            notationMode: mode,
          },
        };
      }),
    );
  },

  toggleNotationMode: () => {
    const current = get().getActiveTab().document.notationMode;
    get().setNotationMode(current === 'chen' ? 'minmax' : 'chen');
  },

  setZoom: (zoom) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    set((state) =>
      updateActiveTab(state, (tab) => {
        if (tab.document.zoom === clamped) return tab;
        return {
          ...tab,
          document: {
            ...tab.document,
            zoom: clamped,
          },
        };
      }),
    );
  },

  setPan: (panX, panY) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        if (tab.document.panX === panX && tab.document.panY === panY) return tab;
        return {
          ...tab,
          document: {
            ...tab.document,
            panX,
            panY,
          },
        };
      }),
    );
  },

  toggleGrid: () => {
    set((state) =>
      updateActiveTab(state, (tab) => ({
        ...tab,
        document: {
          ...tab.document,
          showGrid: !tab.document.showGrid,
        },
      })),
    );
  },

  setGridStyle: (gridStyle) => {
    set((state) =>
      updateActiveTab(state, (tab) => {
        if (tab.document.gridStyle === gridStyle) return tab;
        return {
          ...tab,
          document: {
            ...tab.document,
            gridStyle,
          },
        };
      }),
    );
  },

  toggleSnapToGrid: () => {
    set((state) =>
      updateActiveTab(state, (tab) => ({
        ...tab,
        document: {
          ...tab.document,
          snapToGrid: !tab.document.snapToGrid,
        },
      })),
    );
  },

  pushUndoSnapshot: () => {
    set((state) =>
      updateActiveTab(state, (tab) => ({
        ...tab,
        undoStack: pushToUndo(tab.undoStack, tab.document),
        redoStack: [],
      })),
    );
  },

  undo: () => {
    set((state) => {
      const active = state.tabs.find((t) => t.tabId === state.activeTabId);
      if (!active || active.undoStack.length === 0) return state;
      const previous = active.undoStack[active.undoStack.length - 1];
      const nextUndo = active.undoStack.slice(0, -1);

      return {
        ...updateActiveTab(state, (tab) => ({
          ...tab,
          document: keepViewport(cloneDocument(previous), tab.document),
          undoStack: nextUndo,
          redoStack: [...tab.redoStack, cloneDocument(tab.document)],
          isDirty: true,
        })),
        selectedNodeIds: [],
        selectedEdgeIds: [],
        editingNodeId: null,
      };
    });
  },

  redo: () => {
    set((state) => {
      const active = state.tabs.find((t) => t.tabId === state.activeTabId);
      if (!active || active.redoStack.length === 0) return state;
      const nextDoc = active.redoStack[active.redoStack.length - 1];
      const nextRedo = active.redoStack.slice(0, -1);

      return {
        ...updateActiveTab(state, (tab) => ({
          ...tab,
          document: keepViewport(cloneDocument(nextDoc), tab.document),
          undoStack: pushToUndo(tab.undoStack, tab.document),
          redoStack: nextRedo,
          isDirty: true,
        })),
        selectedNodeIds: [],
        selectedEdgeIds: [],
        editingNodeId: null,
      };
    });
  },

  copySelection: () => {
    const state = get();
    if (state.selectedNodeIds.length === 0) return;
    const active = state.getActiveTab();
    const selectedSet = new Set(state.selectedNodeIds);

    const nodes = active.document.nodes
      .filter((n) => selectedSet.has(n.id))
      .map((n) => ({
        ...n,
        ...(n.style ? { style: { ...n.style } } : {}),
      }));
    const edges = active.document.edges
      .filter((e) => selectedSet.has(e.sourceId) && selectedSet.has(e.targetId))
      .map((e) => ({ ...e }));

    set({ clipboard: { nodes, edges } });
  },

  cutSelection: () => {
    const state = get();
    if (state.selectedNodeIds.length === 0) return;
    state.copySelection();
    state.deleteSelection();
  },

  paste: (offsetX = 40, offsetY = 40) => {
    const state = get();
    if (!state.clipboard || state.clipboard.nodes.length === 0) return;

    const idMap = new Map<string, string>();
    const newNodes: ErmNode[] = state.clipboard.nodes.map((node) => {
      const newId = createId(node.type);
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        x: node.x + offsetX,
        y: node.y + offsetY,
        ...(node.style ? { style: { ...node.style } } : {}),
      };
    });

    const newEdges: ErmEdge[] = [];
    for (const edge of state.clipboard.edges) {
      const nextSource = idMap.get(edge.sourceId);
      const nextTarget = idMap.get(edge.targetId);
      if (nextSource && nextTarget) {
        newEdges.push({
          ...edge,
          id: createId('edge'),
          sourceId: nextSource,
          targetId: nextTarget,
        });
      }
    }

    set((prev) => ({
      ...updateActiveTab(prev, (tab) => ({
        ...tab,
        undoStack: pushToUndo(tab.undoStack, tab.document),
        redoStack: [],
        isDirty: true,
        document: {
          ...tab.document,
          nodes: [...tab.document.nodes, ...newNodes],
          edges: [...tab.document.edges, ...newEdges],
        },
      })),
      selectedNodeIds: newNodes.map((n) => n.id),
      selectedEdgeIds: newEdges.map((e) => e.id),
      editingNodeId: null,
    }));
  },

  markSaved: (meta) => {
    set((state) => {
      const targetTabId = meta?.tabId ?? state.activeTabId;
      return {
        tabs: state.tabs.map((tab) => {
          if (tab.tabId !== targetTabId) return tab;
          return {
            ...tab,
            isDirty: false,
            filePath: meta?.filePath !== undefined ? meta.filePath : tab.filePath,
            fileHandle: meta?.fileHandle !== undefined ? meta.fileHandle : tab.fileHandle,
            document:
              meta?.name !== undefined ? { ...tab.document, name: meta.name } : tab.document,
          };
        }),
      };
    });
  },

  updateAppSettings: (patch) => {
    set((state) => {
      const nextSettings: AppSettings = {
        ...state.appSettings,
        ...patch,
      };
      persistSettingsSafe(nextSettings);
      return { appSettings: nextSettings };
    });
  },

  loadAppSettings: async () => {
    try {
      const loaded = await getPlatformAdapter().loadSettings();
      if (!loaded) return;
      set((state) => ({
        appSettings: {
          ...DEFAULT_APP_SETTINGS,
          ...state.appSettings,
          ...loaded,
          recentFiles: Array.isArray(loaded.recentFiles)
            ? loaded.recentFiles
            : state.appSettings.recentFiles,
        },
      }));
    } catch {
      // Ignore adapter errors
    }
  },

  addRecentFile: (entry) => {
    set((state) => {
      const key = entry.path ?? entry.name;
      const filtered = state.appSettings.recentFiles.filter(
        (item) => (item.path ?? item.name) !== key,
      );
      const nextRecent = [entry, ...filtered].slice(0, MAX_RECENT_FILES);
      const nextSettings: AppSettings = {
        ...state.appSettings,
        recentFiles: nextRecent,
      };
      persistSettingsSafe(nextSettings);
      return { appSettings: nextSettings };
    });
  },

  clearRecentFiles: () => {
    set((state) => {
      const nextSettings: AppSettings = {
        ...state.appSettings,
        recentFiles: [],
      };
      persistSettingsSafe(nextSettings);
      return { appSettings: nextSettings };
    });
  },

  showToast: (message, type = 'info') => {
    set({
      toast: {
        id: createId('toast'),
        message,
        type,
      },
    });
  },

  clearToast: () => {
    set({ toast: null });
  },
}));
