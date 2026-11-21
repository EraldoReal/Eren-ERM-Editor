import type { ErmDocument, ErmNode } from '../model/types.ts';
import { computeModelBounds, getNodeAnchorPoint, getNodeCenter } from './geometry.ts';

export interface SvgExportOptions {
  darkMode?: boolean;
  padding?: number;
  background?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderEntitySvg(
  node: ErmNode,
  fill: string,
  stroke: string,
  textColor: string,
  fontSize: number,
): string {
  const { x, y, width, height, isWeak, label } = node;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const parts: string[] = [];

  parts.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="2" />`,
  );

  if (isWeak) {
    const inset = 5;
    parts.push(
      `<rect x="${x + inset}" y="${y + inset}" width="${Math.max(0, width - inset * 2)}" height="${Math.max(0, height - inset * 2)}" rx="2" fill="none" stroke="${escapeXml(stroke)}" stroke-width="1.5" />`,
    );
  }

  parts.push(
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="${escapeXml(textColor)}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="600">${escapeXml(label)}</text>`,
  );

  return `<g data-node-id="${escapeXml(node.id)}" data-node-type="entity">${parts.join('')}</g>`;
}

function diamondPoints(cx: number, cy: number, rx: number, ry: number): string {
  return `${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`;
}

function renderRelationshipSvg(
  node: ErmNode,
  fill: string,
  stroke: string,
  textColor: string,
  fontSize: number,
): string {
  const { x, y, width, height, isIdentifying, label } = node;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const parts: string[] = [];

  parts.push(
    `<polygon points="${diamondPoints(cx, cy, rx, ry)}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="2" stroke-linejoin="round" />`,
  );

  if (isIdentifying) {
    const inset = 6;
    const innerRx = Math.max(4, rx - inset);
    const innerRy = Math.max(4, ry - inset * (ry / Math.max(1, rx)));
    parts.push(
      `<polygon points="${diamondPoints(cx, cy, innerRx, innerRy)}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="1.5" stroke-linejoin="round" />`,
    );
  }

  parts.push(
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="${escapeXml(textColor)}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="500">${escapeXml(label)}</text>`,
  );

  return `<g data-node-id="${escapeXml(node.id)}" data-node-type="relationship">${parts.join('')}</g>`;
}

function renderAttributeSvg(
  node: ErmNode,
  fill: string,
  stroke: string,
  textColor: string,
  fontSize: number,
): string {
  const { x, y, width, height, isPrimaryKey, isForeignKey, isMultivalued, isDerived, label } =
    node;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const parts: string[] = [];

  const dashAttr = isDerived ? ' stroke-dasharray="6 4"' : '';

  parts.push(
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="2"${dashAttr} />`,
  );

  if (isMultivalued) {
    const inset = 5;
    parts.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(4, rx - inset)}" ry="${Math.max(4, ry - inset)}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="1.5"${dashAttr} />`,
    );
  }

  const textDecoration = isPrimaryKey ? ' text-decoration="underline"' : '';
  const fontWeight = isPrimaryKey ? '600' : '500';
  const fontStyle = isDerived ? ' font-style="italic"' : '';

  parts.push(
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="${escapeXml(textColor)}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}"${fontStyle}${textDecoration}>${escapeXml(label)}</text>`,
  );

  if (isPrimaryKey) {
    const lineHalfW = Math.min(rx - 10, Math.max(16, label.length * fontSize * 0.28));
    const lineY = cy + fontSize * 0.65;
    parts.push(
      `<line x1="${cx - lineHalfW}" y1="${lineY}" x2="${cx + lineHalfW}" y2="${lineY}" stroke="${escapeXml(textColor)}" stroke-width="1.5" />`,
    );
  } else if (isForeignKey) {
    const lineHalfW = Math.min(rx - 10, Math.max(16, label.length * fontSize * 0.28));
    const lineY = cy + fontSize * 0.65;
    parts.push(
      `<line x1="${cx - lineHalfW}" y1="${lineY}" x2="${cx + lineHalfW}" y2="${lineY}" stroke="${escapeXml(textColor)}" stroke-width="1.5" stroke-dasharray="4 3" />`,
    );
  }

  return `<g data-node-id="${escapeXml(node.id)}" data-node-type="attribute">${parts.join('')}</g>`;
}

/**
 * Renders an ERM document to a standalone SVG string in Chen / Min-Max notation.
 */
export function renderErmToSvgString(
  doc: ErmDocument,
  options?: SvgExportOptions,
): string {
  const darkMode = options?.darkMode ?? false;
  const padding = options?.padding ?? 40;
  const background = options?.background ?? (darkMode ? '#0f172a' : '#ffffff');

  const defaultStroke = darkMode ? '#cbd5e1' : '#1e293b';
  const defaultFill = darkMode ? '#1e293b' : '#ffffff';
  const defaultText = darkMode ? '#f8fafc' : '#0f172a';
  const edgeStroke = darkMode ? '#94a3b8' : '#475569';
  const labelText = darkMode ? '#e2e8f0' : '#1e293b';

  const bounds =
    doc.nodes.length > 0
      ? computeModelBounds(doc.nodes, padding)
      : { x: 0, y: 0, width: 400, height: 240 };

  const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));
  const edgeElements: string[] = [];

  for (const edge of doc.edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) continue;

    const sourceCenter = getNodeCenter(source);
    const targetCenter = getNodeCenter(target);
    const p1 = getNodeAnchorPoint(source, targetCenter.x, targetCenter.y);
    const p2 = getNodeAnchorPoint(target, sourceCenter.x, sourceCenter.y);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const edgeParts: string[] = [];

    if (edge.isTotalParticipation) {
      const offset = 2.5;
      edgeParts.push(
        `<line x1="${(p1.x + nx * offset).toFixed(2)}" y1="${(p1.y + ny * offset).toFixed(2)}" x2="${(p2.x + nx * offset).toFixed(2)}" y2="${(p2.y + ny * offset).toFixed(2)}" stroke="${escapeXml(edgeStroke)}" stroke-width="1.75" />`,
      );
      edgeParts.push(
        `<line x1="${(p1.x - nx * offset).toFixed(2)}" y1="${(p1.y - ny * offset).toFixed(2)}" x2="${(p2.x - nx * offset).toFixed(2)}" y2="${(p2.y - ny * offset).toFixed(2)}" stroke="${escapeXml(edgeStroke)}" stroke-width="1.75" />`,
      );
    } else {
      edgeParts.push(
        `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${escapeXml(edgeStroke)}" stroke-width="1.75" />`,
      );
    }

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (edge.cardinality) {
      const cardX = midX + nx * 14;
      const cardY = midY + ny * 14;
      edgeParts.push(
        `<text x="${cardX.toFixed(2)}" y="${cardY.toFixed(2)}" text-anchor="middle" dominant-baseline="central" fill="${escapeXml(labelText)}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">${escapeXml(edge.cardinality)}</text>`,
      );
    }

    if (edge.role) {
      const roleX = midX - nx * 14;
      const roleY = midY - ny * 14;
      edgeParts.push(
        `<text x="${roleX.toFixed(2)}" y="${roleY.toFixed(2)}" text-anchor="middle" dominant-baseline="central" fill="${escapeXml(labelText)}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="11" font-style="italic">${escapeXml(edge.role)}</text>`,
      );
    }

    edgeElements.push(`<g data-edge-id="${escapeXml(edge.id)}">${edgeParts.join('')}</g>`);
  }

  const nodeElements: string[] = [];
  for (const node of doc.nodes) {
    const fill = node.style?.fillColor ?? defaultFill;
    const stroke = node.style?.strokeColor ?? defaultStroke;
    const textColor = node.style?.textColor ?? defaultText;
    const fontSize = node.style?.fontSize ?? (node.type === 'attribute' ? 13 : 14);

    if (node.type === 'entity') {
      nodeElements.push(renderEntitySvg(node, fill, stroke, textColor, fontSize));
    } else if (node.type === 'relationship') {
      nodeElements.push(renderRelationshipSvg(node, fill, stroke, textColor, fontSize));
    } else {
      nodeElements.push(renderAttributeSvg(node, fill, stroke, textColor, fontSize));
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">`,
    `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${escapeXml(background)}" />`,
    `<g data-layer="edges">${edgeElements.join('')}</g>`,
    `<g data-layer="nodes">${nodeElements.join('')}</g>`,
    `</svg>`,
  ].join('\n');
}
