import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS, MAX_ZOOM, MIN_ZOOM, createEmptyDocument } from '../model/defaults.ts';
import { useEditorStore } from './editorStore.ts';
import { t, translations } from './i18n.ts';

vi.mock('../engine/autoLayout.ts', () => ({
  autoLayoutAttributesForNode: vi.fn((doc) => doc),
}));

function resetStore() {
  const initialDoc = createEmptyDocument();
  const initialTabId = 'tab_initial';
  useEditorStore.setState({
    tabs: [
      {
        tabId: initialTabId,
        document: initialDoc,
        filePath: null,
        fileHandle: null,
        isDirty: false,
        undoStack: [],
        redoStack: [],
      },
    ],
    activeTabId: initialTabId,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    activeTool: 'select',
    clipboard: null,
    editingNodeId: null,
    isRelationalSidebarOpen: true,
    appSettings: { ...DEFAULT_APP_SETTINGS },
    toast: null,
  });
}

describe('editorStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('tabs & dirty flag', () => {
    it('starts with 1 empty clean tab', () => {
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      const active = state.getActiveTab();
      expect(active.document.nodes).toEqual([]);
      expect(active.document.edges).toEqual([]);
      expect(active.isDirty).toBe(false);
    });

    it('creates, switches, and closes tabs, keeping at least 1 tab', () => {
      const store = useEditorStore.getState();
      const firstId = store.activeTabId;
      const secondId = store.newTab({ name: 'Second ERM' });

      expect(useEditorStore.getState().tabs).toHaveLength(2);
      expect(useEditorStore.getState().activeTabId).toBe(secondId);
      expect(useEditorStore.getState().getActiveTab().document.name).toBe('Second ERM');

      store.setActiveTab(firstId);
      expect(useEditorStore.getState().activeTabId).toBe(firstId);

      store.closeTab(firstId);
      expect(useEditorStore.getState().tabs).toHaveLength(1);
      expect(useEditorStore.getState().activeTabId).toBe(secondId);

      // Closing the last tab creates a fresh empty tab
      store.closeTab(secondId);
      const afterCloseLast = useEditorStore.getState();
      expect(afterCloseLast.tabs).toHaveLength(1);
      expect(afterCloseLast.activeTabId).not.toBe(secondId);
      expect(afterCloseLast.getActiveTab().document.nodes).toEqual([]);
    });

    it('marks tab dirty on edit and clears dirty on markSaved', () => {
      const store = useEditorStore.getState();
      expect(store.getActiveTab().isDirty).toBe(false);

      store.addNode('entity', 100, 100, 'Kunde');
      expect(useEditorStore.getState().getActiveTab().isDirty).toBe(true);

      store.markSaved({ filePath: '/tmp/kunde.erm', name: 'kunde.erm' });
      const savedTab = useEditorStore.getState().getActiveTab();
      expect(savedTab.isDirty).toBe(false);
      expect(savedTab.filePath).toBe('/tmp/kunde.erm');
      expect(savedTab.document.name).toBe('kunde.erm');
    });

    it('loads demo document in active empty tab or new tab when dirty', () => {
      const store = useEditorStore.getState();
      const firstId = store.activeTabId;
      store.loadDemoDocument('de');

      expect(useEditorStore.getState().tabs).toHaveLength(1);
      expect(useEditorStore.getState().activeTabId).toBe(firstId);
      expect(useEditorStore.getState().getActiveTab().document.nodes.length).toBeGreaterThan(0);
      expect(useEditorStore.getState().getActiveTab().isDirty).toBe(false);

      // Mutate and load EN demo -> should open in a new tab
      store.addNode('entity', 200, 200, 'Extra');
      const newTabId = store.loadDemoDocument('en');
      expect(useEditorStore.getState().tabs).toHaveLength(2);
      expect(useEditorStore.getState().activeTabId).toBe(newTabId);
      expect(useEditorStore.getState().getActiveTab().document.name).toContain('School');
    });
  });

  describe('undo / redo', () => {
    it('supports undo and redo across node edits and clears redoStack on new edit', () => {
      const store = useEditorStore.getState();
      const node = store.addNode('entity', 100, 100, 'Student');
      store.updateNodeLabel(node.id, 'Schüler');

      expect(useEditorStore.getState().getActiveTab().document.nodes[0].label).toBe('Schüler');
      expect(useEditorStore.getState().getActiveTab().undoStack).toHaveLength(2);

      store.undo();
      expect(useEditorStore.getState().getActiveTab().document.nodes[0].label).toBe('Student');
      expect(useEditorStore.getState().getActiveTab().redoStack).toHaveLength(1);

      store.undo();
      expect(useEditorStore.getState().getActiveTab().document.nodes).toHaveLength(0);
      expect(useEditorStore.getState().getActiveTab().redoStack).toHaveLength(2);

      store.redo();
      expect(useEditorStore.getState().getActiveTab().document.nodes).toHaveLength(1);
      expect(useEditorStore.getState().getActiveTab().document.nodes[0].label).toBe('Student');

      // New edit clears redoStack
      store.updateNodeLabel(node.id, 'Kurs');
      expect(useEditorStore.getState().getActiveTab().redoStack).toHaveLength(0);
    });
  });

  describe('copy / cut / paste', () => {
    it('copies selected nodes and internal edges, then pastes with new IDs and offset', () => {
      const store = useEditorStore.getState();
      const ent = store.addNode('entity', 100, 100, 'Kunde');
      const attr = store.addNode('attribute', 200, 100, 'KundenNr');
      const edge = store.addEdge(ent.id, attr.id);
      expect(edge).not.toBeNull();

      store.setSelection([ent.id, attr.id]);
      store.copySelection();
      store.paste(40, 40);

      const doc = useEditorStore.getState().getActiveTab().document;
      expect(doc.nodes).toHaveLength(4);
      expect(doc.edges).toHaveLength(2);

      const pastedNodes = doc.nodes.slice(2);
      expect(pastedNodes[0].id).not.toBe(ent.id);
      expect(pastedNodes[1].id).not.toBe(attr.id);
      expect(pastedNodes[0].x).toBe(ent.x + 40);
      expect(pastedNodes[0].y).toBe(ent.y + 40);

      const pastedEdge = doc.edges[1];
      expect(pastedEdge.id).not.toBe(edge!.id);
      expect(pastedEdge.sourceId).toBe(pastedNodes[0].id);
      expect(pastedEdge.targetId).toBe(pastedNodes[1].id);
    });

    it('cuts selection and removes connected edges', () => {
      const store = useEditorStore.getState();
      const ent = store.addNode('entity', 100, 100, 'Kunde');
      const attr = store.addNode('attribute', 200, 100, 'Name');
      store.addEdge(ent.id, attr.id);

      store.setSelection([ent.id]);
      store.cutSelection();

      const afterCut = useEditorStore.getState().getActiveTab().document;
      expect(afterCut.nodes).toHaveLength(1);
      expect(afterCut.nodes[0].id).toBe(attr.id);
      expect(afterCut.edges).toHaveLength(0);

      store.paste(20, 20);
      expect(useEditorStore.getState().getActiveTab().document.nodes).toHaveLength(2);
    });
  });

  describe('notationMode & view controls', () => {
    it('toggles between chen and minmax notation', () => {
      const store = useEditorStore.getState();
      expect(store.getActiveTab().document.notationMode).toBe('chen');

      store.toggleNotationMode();
      expect(useEditorStore.getState().getActiveTab().document.notationMode).toBe('minmax');
      expect(useEditorStore.getState().getActiveTab().isDirty).toBe(true);

      store.setNotationMode('chen');
      expect(useEditorStore.getState().getActiveTab().document.notationMode).toBe('chen');
    });

    it('clamps zoom and updates pan/grid without marking dirty', () => {
      const store = useEditorStore.getState();
      store.setZoom(10);
      expect(useEditorStore.getState().getActiveTab().document.zoom).toBe(MAX_ZOOM);

      store.setZoom(0.01);
      expect(useEditorStore.getState().getActiveTab().document.zoom).toBe(MIN_ZOOM);

      store.setPan(120, -40);
      store.toggleGrid();
      store.setGridStyle('grid');
      store.toggleSnapToGrid();

      const doc = useEditorStore.getState().getActiveTab().document;
      expect(doc.panX).toBe(120);
      expect(doc.panY).toBe(-40);
      expect(doc.showGrid).toBe(false);
      expect(doc.gridStyle).toBe('grid');
      expect(doc.snapToGrid).toBe(false);
      expect(useEditorStore.getState().getActiveTab().isDirty).toBe(false);
    });
  });

  describe('attribute, entity & relationship flags', () => {
    it('toggles PK, FK, multivalued, derived on attributes only', () => {
      const store = useEditorStore.getState();
      const attr = store.addNode('attribute', 100, 100, 'Email');
      const ent = store.addNode('entity', 300, 100, 'Person');

      store.toggleAttributeFlag(attr.id, 'isPrimaryKey');
      store.toggleAttributeFlag(attr.id, 'isForeignKey');
      store.toggleAttributeFlag(attr.id, 'isMultivalued');
      store.toggleAttributeFlag(attr.id, 'isDerived');
      // Should be ignored on entity
      store.toggleAttributeFlag(ent.id, 'isPrimaryKey');

      const nodes = useEditorStore.getState().getActiveTab().document.nodes;
      const updatedAttr = nodes.find((n) => n.id === attr.id)!;
      const updatedEnt = nodes.find((n) => n.id === ent.id)!;

      expect(updatedAttr.isPrimaryKey).toBe(true);
      expect(updatedAttr.isForeignKey).toBe(true);
      expect(updatedAttr.isMultivalued).toBe(true);
      expect(updatedAttr.isDerived).toBe(true);
      expect(updatedEnt.isPrimaryKey).toBeUndefined();
    });

    it('toggles weak entity and identifying relationship flags', () => {
      const store = useEditorStore.getState();
      const ent = store.addNode('entity', 100, 100, 'Position');
      const rel = store.addNode('relationship', 260, 100, 'enthält');

      store.toggleWeakEntity(ent.id);
      store.toggleIdentifyingRelationship(rel.id);

      const nodes = useEditorStore.getState().getActiveTab().document.nodes;
      expect(nodes.find((n) => n.id === ent.id)!.isWeak).toBe(true);
      expect(nodes.find((n) => n.id === rel.id)!.isIdentifying).toBe(true);
    });
  });

  describe('edge creation & deletion', () => {
    it('allows valid connections and rejects invalid or duplicate connections', () => {
      const store = useEditorStore.getState();
      const ent1 = store.addNode('entity', 100, 100, 'A');
      const ent2 = store.addNode('entity', 300, 100, 'B');
      const rel = store.addNode('relationship', 200, 100, 'R');
      const attr1 = store.addNode('attribute', 100, 200, 'a1');
      const attr2 = store.addNode('attribute', 300, 200, 'a2');

      // Invalid: entity <-> entity, attribute <-> attribute, self-loop
      expect(store.addEdge(ent1.id, ent2.id)).toBeNull();
      expect(store.addEdge(attr1.id, attr2.id)).toBeNull();
      expect(store.addEdge(ent1.id, ent1.id)).toBeNull();

      // Valid: entity <-> relationship, entity <-> attribute, relationship <-> attribute
      const e1 = store.addEdge(ent1.id, rel.id, '1');
      const e2 = store.addEdge(ent1.id, attr1.id);
      const e3 = store.addEdge(rel.id, attr2.id);
      expect(e1).not.toBeNull();
      expect(e2).not.toBeNull();
      expect(e3).not.toBeNull();

      // Duplicate in reverse direction rejected
      expect(store.addEdge(rel.id, ent1.id, 'n')).toBeNull();

      // Update edge cardinality, role, total participation
      store.updateEdge(e1!.id, {
        cardinality: '(1,n)',
        role: 'Arbeitgeber',
        isTotalParticipation: true,
      });
      const updated = useEditorStore
        .getState()
        .getActiveTab()
        .document.edges.find((e) => e.id === e1!.id)!;
      expect(updated.cardinality).toBe('(1,n)');
      expect(updated.role).toBe('Arbeitgeber');
      expect(updated.isTotalParticipation).toBe(true);
    });
  });
});

describe('i18n', () => {
  it('has matching keys for DE and EN and interpolates params', () => {
    const deKeys = Object.keys(translations.de).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(enKeys).toEqual(deKeys);

    expect(t('de', 'menu.file.save')).toBe('Speichern');
    expect(t('en', 'menu.file.save')).toBe('Save');
    expect(t('de', 'sidebar.tablesCount', { count: 4 })).toBe('4 Relationen');
    expect(t('en', 'sidebar.tablesCount', { count: 4 })).toBe('4 relations');
    expect(t('de', 'imprint.legal')).toContain('§ 5 DDG / § 18 Abs. 2 MStV');
    expect(t('de', 'imprint.legal')).toContain('info@best-tools.app');
  });
});
