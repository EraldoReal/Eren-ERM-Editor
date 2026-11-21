import type { ErmDocument, ErmNode } from '../model/types.ts';
import { getNodeCenter } from './geometry.ts';

const CENTER_CLEARANCE = 44;
const ATTR_GAP_X = 24;
const ATTR_GAP_Y = 20;

function boxesOverlap(a: ErmNode, b: ErmNode, margin = 8): boolean {
  return (
    a.x - margin < b.x + b.width &&
    a.x + a.width + margin > b.x &&
    a.y - margin < b.y + b.height &&
    a.y + a.height + margin > b.y
  );
}

/**
 * Arranges all attribute nodes directly connected to `centerNodeId`
 * in a clean ring around the center node without overlapping each other
 * or the center node. Returns a new `ErmDocument`.
 */
export function autoLayoutAttributesForNode(
  doc: ErmDocument,
  centerNodeId: string,
): ErmDocument {
  const centerNode = doc.nodes.find((n) => n.id === centerNodeId);
  if (!centerNode) {
    return doc;
  }

  const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));
  const connectedAttrIds = new Set<string>();

  for (const edge of doc.edges) {
    if (edge.sourceId === centerNodeId) {
      const target = nodeById.get(edge.targetId);
      if (target?.type === 'attribute') {
        connectedAttrIds.add(target.id);
      }
    } else if (edge.targetId === centerNodeId) {
      const source = nodeById.get(edge.sourceId);
      if (source?.type === 'attribute') {
        connectedAttrIds.add(source.id);
      }
    }
  }

  if (connectedAttrIds.size === 0) {
    return doc;
  }

  const attributes = doc.nodes.filter((n) => connectedAttrIds.has(n.id));
  const center = getNodeCenter(centerNode);
  const count = attributes.length;

  let maxAttrW = 0;
  let maxAttrH = 0;
  for (const attr of attributes) {
    if (attr.width > maxAttrW) maxAttrW = attr.width;
    if (attr.height > maxAttrH) maxAttrH = attr.height;
  }

  const rxBase = centerNode.width / 2 + maxAttrW / 2 + CENTER_CLEARANCE;
  const ryBase = centerNode.height / 2 + maxAttrH / 2 + CENTER_CLEARANCE;

  let rx = rxBase;
  let ry = ryBase;

  if (count > 1) {
    const sinHalfStep = Math.sin(Math.PI / count);
    const minRxForSpacing = (maxAttrW + ATTR_GAP_X) / (2 * sinHalfStep);
    const minRyForSpacing = (maxAttrH + ATTR_GAP_Y) / (2 * sinHalfStep);
    rx = Math.max(rxBase, minRxForSpacing);
    ry = Math.max(ryBase, minRyForSpacing);
  }

  // Start at top (-PI/2) and distribute evenly clockwise
  const startAngle = -Math.PI / 2;
  const placed = new Map<string, ErmNode>();

  const placedList: ErmNode[] = attributes.map((attr, index) => {
    const angle = startAngle + (2 * Math.PI * index) / count;
    const targetCx = center.x + rx * Math.cos(angle);
    const targetCy = center.y + ry * Math.sin(angle);
    return {
      ...attr,
      x: Math.round(targetCx - attr.width / 2),
      y: Math.round(targetCy - attr.height / 2),
    };
  });

  // Safety pass: push any overlapping attributes radially outward until zero overlaps remain
  for (let pass = 0; pass < 12; pass += 1) {
    let anyOverlap = false;
    for (let i = 0; i < placedList.length; i += 1) {
      const a = placedList[i];
      if (boxesOverlap(a, centerNode, 12)) {
        anyOverlap = true;
        const ac = getNodeCenter(a);
        const dx = ac.x - center.x || 1;
        const dy = ac.y - center.y || -1;
        const len = Math.hypot(dx, dy);
        a.x = Math.round(a.x + (dx / len) * 20);
        a.y = Math.round(a.y + (dy / len) * 20);
      }
      for (let j = i + 1; j < placedList.length; j += 1) {
        const b = placedList[j];
        if (boxesOverlap(a, b, 8)) {
          anyOverlap = true;
          const bc = getNodeCenter(b);
          const dx = bc.x - center.x || 1;
          const dy = bc.y - center.y || 1;
          const len = Math.hypot(dx, dy);
          b.x = Math.round(b.x + (dx / len) * 20);
          b.y = Math.round(b.y + (dy / len) * 20);
        }
      }
    }
    if (!anyOverlap) {
      break;
    }
  }

  for (const attr of placedList) {
    placed.set(attr.id, attr);
  }

  return {
    ...doc,
    nodes: doc.nodes.map((node) => placed.get(node.id) ?? node),
  };
}
