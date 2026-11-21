import type { ErmNode } from '../model/types.ts';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns the center point of an ERM node.
 * Node coordinates (x, y) represent the top-left corner of its bounding box.
 */
export function getNodeCenter(node: Pick<ErmNode, 'x' | 'y' | 'width' | 'height'>): Point {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

/**
 * Checks whether two ERM nodes can be validly connected in Chen notation.
 * Only entity<->relationship, entity<->attribute, and relationship<->attribute are allowed.
 */
export function isValidErmConnection(a: ErmNode, b: ErmNode): boolean {
  if (a.id === b.id) {
    return false;
  }
  if (a.type === b.type) {
    return false;
  }
  return true;
}

/**
 * Computes the exact border intersection point on `node` for a ray
 * originating at the node's center and pointing toward `(targetX, targetY)`.
 */
export function getNodeAnchorPoint(node: ErmNode, targetX: number, targetY: number): Point {
  const { x: cx, y: cy } = getNodeCenter(node);
  const rx = node.width / 2;
  const ry = node.height / 2;

  if (rx <= 0 || ry <= 0) {
    return { x: cx, y: cy };
  }

  const dx = targetX - cx;
  const dy = targetY - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy - ry };
  }

  switch (node.type) {
    case 'entity': {
      const tx = dx !== 0 ? rx / Math.abs(dx) : Number.POSITIVE_INFINITY;
      const ty = dy !== 0 ? ry / Math.abs(dy) : Number.POSITIVE_INFINITY;
      const t = Math.min(tx, ty);
      return {
        x: cx + t * dx,
        y: cy + t * dy,
      };
    }

    case 'relationship': {
      const denom = Math.abs(dx) / rx + Math.abs(dy) / ry;
      const t = 1 / denom;
      return {
        x: cx + t * dx,
        y: cy + t * dy,
      };
    }

    case 'attribute': {
      const denom = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
      const t = 1 / denom;
      return {
        x: cx + t * dx,
        y: cy + t * dy,
      };
    }
  }
}

/**
 * Computes the axis-aligned bounding box enclosing all given nodes,
 * expanded by `padding` on all four sides.
 */
export function computeModelBounds(nodes: readonly ErmNode[], padding = 0): Bounds {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + node.width > maxX) maxX = node.x + node.width;
    if (node.y + node.height > maxY) maxY = node.y + node.height;
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
