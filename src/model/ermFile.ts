import { DEFAULT_NODE_DIMENSIONS, MAX_ZOOM, MIN_ZOOM, createId } from './defaults.ts';
import type {
  ErmCardinality,
  ErmDocument,
  ErmEdge,
  ErmNode,
  ErmNodeStyle,
  ErmNodeType,
  GridStyle,
  NotationMode,
} from './types.ts';

export const ERM_FILE_FORMAT_ID = 'erm-editor';
export const ERM_FILE_VERSION = 1;
export const ERM_FILE_EXTENSION = 'erm';

export interface ErmFileEnvelope {
  format: typeof ERM_FILE_FORMAT_ID;
  version: number;
  exportedAt: string;
  document: ErmDocument;
}

export class ErmFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErmFileValidationError';
  }
}

const VALID_NODE_TYPES = new Set<ErmNodeType>(['entity', 'relationship', 'attribute']);
const VALID_NOTATION_MODES = new Set<NotationMode>(['chen', 'minmax']);
const VALID_GRID_STYLES = new Set<GridStyle>(['dots', 'grid']);
const VALID_CARDINALITIES = new Set<ErmCardinality>([
  '1',
  'n',
  'm',
  'c',
  'cn',
  '(0,1)',
  '(1,1)',
  '(0,n)',
  '(1,n)',
  '(0,*)',
  '',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateNodeStyle(value: unknown, index: number): ErmNodeStyle | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new ErmFileValidationError(`Node[${index}].style must be an object`);
  }
  const style: ErmNodeStyle = {};
  if (value.fillColor !== undefined) {
    if (typeof value.fillColor !== 'string') {
      throw new ErmFileValidationError(`Node[${index}].style.fillColor must be a string`);
    }
    style.fillColor = value.fillColor;
  }
  if (value.strokeColor !== undefined) {
    if (typeof value.strokeColor !== 'string') {
      throw new ErmFileValidationError(`Node[${index}].style.strokeColor must be a string`);
    }
    style.strokeColor = value.strokeColor;
  }
  if (value.textColor !== undefined) {
    if (typeof value.textColor !== 'string') {
      throw new ErmFileValidationError(`Node[${index}].style.textColor must be a string`);
    }
    style.textColor = value.textColor;
  }
  if (value.fontSize !== undefined) {
    if (!isFiniteNumber(value.fontSize) || value.fontSize <= 0) {
      throw new ErmFileValidationError(`Node[${index}].style.fontSize must be a positive number`);
    }
    style.fontSize = value.fontSize;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function validateNode(value: unknown, index: number): ErmNode {
  if (!isRecord(value)) {
    throw new ErmFileValidationError(`Node[${index}] must be an object`);
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    throw new ErmFileValidationError(`Node[${index}].id must be a non-empty string`);
  }
  if (typeof value.type !== 'string' || !VALID_NODE_TYPES.has(value.type as ErmNodeType)) {
    throw new ErmFileValidationError(
      `Node[${index}].type must be one of 'entity', 'relationship', 'attribute'`,
    );
  }
  const nodeType = value.type as ErmNodeType;
  if (typeof value.label !== 'string') {
    throw new ErmFileValidationError(`Node[${index}].label must be a string`);
  }
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    throw new ErmFileValidationError(`Node[${index}] x and y must be finite numbers`);
  }

  const defaults = DEFAULT_NODE_DIMENSIONS[nodeType];
  const width = value.width === undefined ? defaults.width : value.width;
  const height = value.height === undefined ? defaults.height : value.height;

  if (!isFiniteNumber(width) || width <= 0 || !isFiniteNumber(height) || height <= 0) {
    throw new ErmFileValidationError(`Node[${index}] width and height must be positive numbers`);
  }

  const node: ErmNode = {
    id: value.id,
    type: nodeType,
    label: value.label,
    x: value.x,
    y: value.y,
    width,
    height,
  };

  const optionalFlags = [
    'isWeak',
    'isIdentifying',
    'isPrimaryKey',
    'isForeignKey',
    'isMultivalued',
    'isDerived',
  ] as const;

  for (const flag of optionalFlags) {
    const flagVal = value[flag];
    if (flagVal !== undefined) {
      if (typeof flagVal !== 'boolean') {
        throw new ErmFileValidationError(`Node[${index}].${flag} must be a boolean`);
      }
      if (flagVal) {
        node[flag] = true;
      }
    }
  }

  const style = validateNodeStyle(value.style, index);
  if (style) {
    node.style = style;
  }

  return node;
}

function validateEdge(value: unknown, index: number, nodeIds: Set<string>): ErmEdge {
  if (!isRecord(value)) {
    throw new ErmFileValidationError(`Edge[${index}] must be an object`);
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    throw new ErmFileValidationError(`Edge[${index}].id must be a non-empty string`);
  }
  if (typeof value.sourceId !== 'string' || !nodeIds.has(value.sourceId)) {
    throw new ErmFileValidationError(`Edge[${index}].sourceId references unknown node`);
  }
  if (typeof value.targetId !== 'string' || !nodeIds.has(value.targetId)) {
    throw new ErmFileValidationError(`Edge[${index}].targetId references unknown node`);
  }
  const cardinality = value.cardinality ?? '';
  if (
    typeof cardinality !== 'string' ||
    !VALID_CARDINALITIES.has(cardinality as ErmCardinality)
  ) {
    throw new ErmFileValidationError(`Edge[${index}].cardinality is invalid`);
  }

  const edge: ErmEdge = {
    id: value.id,
    sourceId: value.sourceId,
    targetId: value.targetId,
    cardinality: cardinality as ErmCardinality,
  };

  if (value.role !== undefined) {
    if (typeof value.role !== 'string') {
      throw new ErmFileValidationError(`Edge[${index}].role must be a string`);
    }
    if (value.role.length > 0) {
      edge.role = value.role;
    }
  }

  if (value.isTotalParticipation !== undefined) {
    if (typeof value.isTotalParticipation !== 'boolean') {
      throw new ErmFileValidationError(`Edge[${index}].isTotalParticipation must be a boolean`);
    }
    if (value.isTotalParticipation) {
      edge.isTotalParticipation = true;
    }
  }

  return edge;
}

export function validateErmDocument(value: unknown): ErmDocument {
  if (!isRecord(value)) {
    throw new ErmFileValidationError('Document must be a JSON object');
  }

  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : createId('doc');
  const name =
    typeof value.name === 'string' && value.name.trim().length > 0
      ? value.name
      : 'Unbenanntes ERM';

  const notationModeRaw = value.notationMode ?? 'chen';
  if (
    typeof notationModeRaw !== 'string' ||
    !VALID_NOTATION_MODES.has(notationModeRaw as NotationMode)
  ) {
    throw new ErmFileValidationError("notationMode must be 'chen' or 'minmax'");
  }

  if (!Array.isArray(value.nodes)) {
    throw new ErmFileValidationError('nodes must be an array');
  }
  if (!Array.isArray(value.edges)) {
    throw new ErmFileValidationError('edges must be an array');
  }

  const nodes = value.nodes.map((node, index) => validateNode(node, index));
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      throw new ErmFileValidationError(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  const edges = value.edges.map((edge, index) => validateEdge(edge, index, nodeIds));
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) {
      throw new ErmFileValidationError(`Duplicate edge id: ${edge.id}`);
    }
    edgeIds.add(edge.id);
  }

  const zoomRaw = value.zoom === undefined ? 1 : value.zoom;
  const panX = value.panX === undefined ? 0 : value.panX;
  const panY = value.panY === undefined ? 0 : value.panY;
  if (!isFiniteNumber(zoomRaw) || zoomRaw <= 0) {
    throw new ErmFileValidationError('zoom must be a positive number');
  }
  // A hand-edited file must not be able to open with an unusable zoom level
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRaw));
  if (!isFiniteNumber(panX) || !isFiniteNumber(panY)) {
    throw new ErmFileValidationError('panX and panY must be finite numbers');
  }

  const showGrid = value.showGrid === undefined ? true : value.showGrid;
  if (typeof showGrid !== 'boolean') {
    throw new ErmFileValidationError('showGrid must be a boolean');
  }

  const gridStyleRaw = value.gridStyle ?? 'dots';
  if (typeof gridStyleRaw !== 'string' || !VALID_GRID_STYLES.has(gridStyleRaw as GridStyle)) {
    throw new ErmFileValidationError("gridStyle must be 'dots' or 'grid'");
  }

  const snapToGrid = value.snapToGrid === undefined ? true : value.snapToGrid;
  if (typeof snapToGrid !== 'boolean') {
    throw new ErmFileValidationError('snapToGrid must be a boolean');
  }

  return {
    id,
    name,
    notationMode: notationModeRaw as NotationMode,
    nodes,
    edges,
    zoom,
    panX,
    panY,
    showGrid,
    gridStyle: gridStyleRaw as GridStyle,
    snapToGrid,
  };
}

export function serializeErmFile(doc: ErmDocument): string {
  const envelope: ErmFileEnvelope = {
    format: ERM_FILE_FORMAT_ID,
    version: ERM_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    document: doc,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseErmFile(raw: string): ErmDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ErmFileValidationError(
      `Invalid JSON in .erm file: ${error instanceof Error ? error.message : 'parse error'}`,
    );
  }

  if (!isRecord(parsed)) {
    throw new ErmFileValidationError('Root of .erm file must be a JSON object');
  }

  if ('format' in parsed || 'document' in parsed) {
    if (parsed.format !== ERM_FILE_FORMAT_ID) {
      throw new ErmFileValidationError(
        `Unsupported .erm file format: ${String(parsed.format)}`,
      );
    }
    if (typeof parsed.version !== 'number' || parsed.version > ERM_FILE_VERSION) {
      throw new ErmFileValidationError(
        `Unsupported .erm file version: ${String(parsed.version)}`,
      );
    }
    return validateErmDocument(parsed.document);
  }

  return validateErmDocument(parsed);
}
