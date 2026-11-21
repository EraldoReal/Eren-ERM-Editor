import type {
  AppSettings,
  ErmCardinality,
  ErmDocument,
  ErmEdge,
  ErmNode,
  ErmNodeType,
} from './types.ts';

export const GRID_SIZE = 20;

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

export const DEFAULT_NODE_DIMENSIONS: Record<ErmNodeType, { width: number; height: number }> = {
  entity: { width: 140, height: 64 },
  relationship: { width: 140, height: 80 },
  attribute: { width: 130, height: 52 },
};

export const DEFAULT_NODE_LABELS: Record<ErmNodeType, string> = {
  entity: 'Entität',
  relationship: 'Beziehung',
  attribute: 'Attribut',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'light',
  language: 'de',
  defaultNotationMode: 'chen',
  defaultShowGrid: true,
  defaultGridStyle: 'dots',
  defaultSnapToGrid: true,
  uiScale: 1,
  recentFiles: [],
};

export function createId(prefix = 'erm'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${random}`;
}

export function createDefaultNode(
  type: ErmNodeType,
  x: number,
  y: number,
  label?: string,
): ErmNode {
  const { width, height } = DEFAULT_NODE_DIMENSIONS[type];
  return {
    id: createId(type),
    type,
    label: label ?? DEFAULT_NODE_LABELS[type],
    x,
    y,
    width,
    height,
  };
}

export function createDefaultEdge(
  sourceId: string,
  targetId: string,
  cardinality: ErmCardinality = '',
): ErmEdge {
  return {
    id: createId('edge'),
    sourceId,
    targetId,
    cardinality,
  };
}

export function createEmptyDocument(
  name = 'Unbenanntes ERM',
  options?: Partial<Pick<ErmDocument, 'notationMode' | 'showGrid' | 'gridStyle' | 'snapToGrid'>>,
): ErmDocument {
  return {
    id: createId('doc'),
    name,
    notationMode: options?.notationMode ?? 'chen',
    nodes: [],
    edges: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: options?.showGrid ?? true,
    gridStyle: options?.gridStyle ?? 'dots',
    snapToGrid: options?.snapToGrid ?? true,
  };
}
