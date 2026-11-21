import React from 'react';
import { getNodeAnchorPoint, getNodeCenter } from '../engine/geometry.ts';
import { GRID_SIZE } from '../model/defaults.ts';
import type { ErmDocument, ErmEdge, ErmNode } from '../model/types.ts';

export const WORKSPACE_WIDTH = 4000;
export const WORKSPACE_HEIGHT = 3000;

export interface PreviewEdgeState {
  sourceNodeId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isValid: boolean | null;
}

export interface MarqueeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ErmSvgCanvasProps {
  document: ErmDocument;
  darkMode: boolean;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  editingNodeId: string | null;
  connectingFromNodeId: string | null;
  hoveredTargetNodeId: string | null;
  hoveredTargetValid: boolean | null;
  previewEdge: PreviewEdgeState | null;
  marqueeBox: MarqueeBox | null;
  onNodePointerDown: (e: React.PointerEvent<SVGGElement>, node: ErmNode) => void;
  onNodeDoubleClick: (e: React.MouseEvent<SVGGElement>, node: ErmNode) => void;
  onNodeContextMenu: (e: React.MouseEvent<SVGGElement>, node: ErmNode) => void;
  onNodePointerEnter: (node: ErmNode) => void;
  onNodePointerLeave: (node: ErmNode) => void;
  onHandlePointerDown: (e: React.PointerEvent<SVGCircleElement>, node: ErmNode) => void;
  onEdgePointerDown: (e: React.PointerEvent<SVGGElement>, edge: ErmEdge) => void;
  onEdgeContextMenu: (e: React.MouseEvent<SVGGElement>, edge: ErmEdge) => void;
}

function diamondPoints(cx: number, cy: number, rx: number, ry: number): string {
  return `${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`;
}

export const ErmSvgCanvas: React.FC<ErmSvgCanvasProps> = ({
  document: doc,
  darkMode,
  selectedNodeIds,
  selectedEdgeIds,
  editingNodeId,
  connectingFromNodeId,
  hoveredTargetNodeId,
  hoveredTargetValid,
  previewEdge,
  marqueeBox,
  onNodePointerDown,
  onNodeDoubleClick,
  onNodeContextMenu,
  onNodePointerEnter,
  onNodePointerLeave,
  onHandlePointerDown,
  onEdgePointerDown,
  onEdgeContextMenu,
}) => {
  const selectedNodeSet = new Set(selectedNodeIds);
  const selectedEdgeSet = new Set(selectedEdgeIds);
  const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));

  const defaultStroke = darkMode ? '#cbd5e1' : '#1e293b';
  const defaultFill = darkMode ? '#1e293b' : '#ffffff';
  const defaultText = darkMode ? '#f8fafc' : '#0f172a';
  const edgeStroke = darkMode ? '#94a3b8' : '#475569';
  const labelText = darkMode ? '#e2e8f0' : '#1e293b';
  const labelBg = darkMode ? '#0f172a' : '#f8fafc';
  const gridColor = darkMode ? '#334155' : '#cbd5e1';
  const patternId = `erm-grid-${doc.gridStyle}-${darkMode ? 'dark' : 'light'}`;

  return (
    <svg
      width={WORKSPACE_WIDTH}
      height={WORKSPACE_HEIGHT}
      viewBox={`0 0 ${WORKSPACE_WIDTH} ${WORKSPACE_HEIGHT}`}
      className="block select-none"
    >
      <defs>
        {doc.showGrid && doc.gridStyle === 'dots' && (
          <pattern
            id={patternId}
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1} cy={1} r={1.15} fill={gridColor} />
          </pattern>
        )}
        {doc.showGrid && doc.gridStyle === 'grid' && (
          <pattern
            id={patternId}
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
              fill="none"
              stroke={gridColor}
              strokeWidth={0.6}
              opacity={0.7}
            />
          </pattern>
        )}
      </defs>

      {/* Workspace background */}
      <rect
        x={0}
        y={0}
        width={WORKSPACE_WIDTH}
        height={WORKSPACE_HEIGHT}
        fill={darkMode ? '#0f172a' : '#ffffff'}
      />
      {doc.showGrid && (
        <rect
          x={0}
          y={0}
          width={WORKSPACE_WIDTH}
          height={WORKSPACE_HEIGHT}
          fill={`url(#${patternId})`}
        />
      )}

      {/* Workspace boundary */}
      <rect
        x={0.5}
        y={0.5}
        width={WORKSPACE_WIDTH - 1}
        height={WORKSPACE_HEIGHT - 1}
        fill="none"
        stroke={darkMode ? '#1e293b' : '#e2e8f0'}
        strokeWidth={1}
      />

      {/* Edges layer */}
      <g data-layer="edges">
        {doc.edges.map((edge) => {
          const source = nodeById.get(edge.sourceId);
          const target = nodeById.get(edge.targetId);
          if (!source || !target) return null;

          const sourceCenter = getNodeCenter(source);
          const targetCenter = getNodeCenter(target);
          const p1 = getNodeAnchorPoint(source, targetCenter.x, targetCenter.y);
          const p2 = getNodeAnchorPoint(target, sourceCenter.x, sourceCenter.y);

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          const isSelected = selectedEdgeSet.has(edge.id);
          const stroke = isSelected ? '#2563eb' : edgeStroke;
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          return (
            <g
              key={edge.id}
              data-edge-id={edge.id}
              className="cursor-pointer"
              onPointerDown={(e) => onEdgePointerDown(e, edge)}
              onContextMenu={(e) => onEdgeContextMenu(e, edge)}
            >
              {/* Invisible wide hit-area */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth={16}
              />

              {/* Selection glow */}
              {isSelected && (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#3b82f6"
                  strokeWidth={edge.isTotalParticipation ? 9 : 6}
                  strokeOpacity={0.25}
                  strokeLinecap="round"
                />
              )}

              {edge.isTotalParticipation ? (
                <>
                  <line
                    x1={p1.x + nx * 2.5}
                    y1={p1.y + ny * 2.5}
                    x2={p2.x + nx * 2.5}
                    y2={p2.y + ny * 2.5}
                    stroke={stroke}
                    strokeWidth={1.75}
                  />
                  <line
                    x1={p1.x - nx * 2.5}
                    y1={p1.y - ny * 2.5}
                    x2={p2.x - nx * 2.5}
                    y2={p2.y - ny * 2.5}
                    stroke={stroke}
                    strokeWidth={1.75}
                  />
                </>
              ) : (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={stroke}
                  strokeWidth={1.75}
                />
              )}

              {edge.cardinality && (
                <g transform={`translate(${midX + nx * 15}, ${midY + ny * 15})`}>
                  <rect
                    x={-16}
                    y={-10}
                    width={32}
                    height={20}
                    rx={4}
                    fill={labelBg}
                    fillOpacity={0.85}
                  />
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isSelected ? '#2563eb' : labelText}
                    fontSize={12}
                    fontWeight={600}
                    className="font-sans"
                  >
                    {edge.cardinality}
                  </text>
                </g>
              )}

              {edge.role && (
                <text
                  x={midX - nx * 15}
                  y={midY - ny * 15}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? '#2563eb' : labelText}
                  fontSize={11}
                  fontStyle="italic"
                  className="font-sans"
                >
                  {edge.role}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Live preview edge while connecting */}
      {previewEdge && (
        <line
          x1={previewEdge.x1}
          y1={previewEdge.y1}
          x2={previewEdge.x2}
          y2={previewEdge.y2}
          stroke={
            previewEdge.isValid === true
              ? '#10b981'
              : previewEdge.isValid === false
                ? '#ef4444'
                : '#3b82f6'
          }
          strokeWidth={2}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      )}

      {/* Nodes layer */}
      <g data-layer="nodes">
        {doc.nodes.map((node) => {
          const isSelected = selectedNodeSet.has(node.id);
          const isEditing = editingNodeId === node.id;
          const isConnectingSource = connectingFromNodeId === node.id;
          const isHoveredTarget = hoveredTargetNodeId === node.id;

          const fill = node.style?.fillColor ?? defaultFill;
          const stroke = isSelected
            ? '#2563eb'
            : isHoveredTarget
              ? hoveredTargetValid
                ? '#10b981'
                : '#ef4444'
              : (node.style?.strokeColor ?? defaultStroke);
          const textColor = node.style?.textColor ?? defaultText;
          const fontSize = node.style?.fontSize ?? (node.type === 'attribute' ? 13 : 14);

          const cx = node.x + node.width / 2;
          const cy = node.y + node.height / 2;
          const rx = node.width / 2;
          const ry = node.height / 2;

          return (
            <g
              key={node.id}
              data-node-id={node.id}
              data-node-type={node.type}
              className="cursor-move"
              onPointerDown={(e) => onNodePointerDown(e, node)}
              onDoubleClick={(e) => onNodeDoubleClick(e, node)}
              onContextMenu={(e) => onNodeContextMenu(e, node)}
              onPointerEnter={() => onNodePointerEnter(node)}
              onPointerLeave={() => onNodePointerLeave(node)}
            >
              {/* Selection or target highlight halo */}
              {(isSelected || isConnectingSource || isHoveredTarget) && (
                <rect
                  x={node.x - 4}
                  y={node.y - 4}
                  width={node.width + 8}
                  height={node.height + 8}
                  rx={8}
                  fill="none"
                  stroke={
                    isHoveredTarget
                      ? hoveredTargetValid
                        ? '#10b981'
                        : '#ef4444'
                      : '#3b82f6'
                  }
                  strokeWidth={1.75}
                  strokeDasharray={isSelected && !isHoveredTarget ? '4 3' : undefined}
                  pointerEvents="none"
                />
              )}

              {/* Entity shape */}
              {node.type === 'entity' && (
                <>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx={4}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                  />
                  {node.isWeak && (
                    <rect
                      x={node.x + 5}
                      y={node.y + 5}
                      width={Math.max(0, node.width - 10)}
                      height={Math.max(0, node.height - 10)}
                      rx={2}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1.5}
                    />
                  )}
                </>
              )}

              {/* Relationship shape */}
              {node.type === 'relationship' && (
                <>
                  <polygon
                    points={diamondPoints(cx, cy, rx, ry)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                  {node.isIdentifying && (
                    <polygon
                      points={diamondPoints(
                        cx,
                        cy,
                        Math.max(4, rx - 6),
                        Math.max(4, ry - 6 * (ry / Math.max(1, rx))),
                      )}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                    />
                  )}
                </>
              )}

              {/* Attribute shape */}
              {node.type === 'attribute' && (
                <>
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeDasharray={node.isDerived ? '6 4' : undefined}
                  />
                  {node.isMultivalued && (
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={Math.max(4, rx - 5)}
                      ry={Math.max(4, ry - 5)}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1.5}
                      strokeDasharray={node.isDerived ? '6 4' : undefined}
                    />
                  )}
                </>
              )}

              {/* Node label (hidden while inline editing) */}
              {!isEditing && (
                <>
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    fontSize={fontSize}
                    fontWeight={
                      node.type === 'entity' || node.isPrimaryKey ? 600 : 500
                    }
                    fontStyle={node.isDerived ? 'italic' : 'normal'}
                    textDecoration={node.isPrimaryKey ? 'underline' : undefined}
                    className="pointer-events-none font-sans"
                  >
                    {node.label}
                  </text>

                  {/* Dashed underline for Foreign Key (when not Primary Key) */}
                  {node.type === 'attribute' && !node.isPrimaryKey && node.isForeignKey && (
                    <line
                      x1={cx - Math.min(rx - 10, Math.max(16, node.label.length * fontSize * 0.28))}
                      y1={cy + fontSize * 0.65}
                      x2={cx + Math.min(rx - 10, Math.max(16, node.label.length * fontSize * 0.28))}
                      y2={cy + fontSize * 0.65}
                      stroke={textColor}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                    />
                  )}
                </>
              )}

              {/* Connection handles on selected node */}
              {isSelected && selectedNodeIds.length === 1 && !isEditing && (
                <g>
                  {[
                    { key: 'top', hx: cx, hy: node.y },
                    { key: 'right', hx: node.x + node.width, hy: cy },
                    { key: 'bottom', hx: cx, hy: node.y + node.height },
                    { key: 'left', hx: node.x, hy: cy },
                  ].map((h) => (
                    <circle
                      key={h.key}
                      cx={h.hx}
                      cy={h.hy}
                      r={5}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={2}
                      className="cursor-crosshair"
                      onPointerDown={(e) => onHandlePointerDown(e, node)}
                    />
                  ))}
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* Marquee selection box */}
      {marqueeBox && (
        <rect
          x={marqueeBox.x}
          y={marqueeBox.y}
          width={marqueeBox.width}
          height={marqueeBox.height}
          fill="#3b82f6"
          fillOpacity={0.12}
          stroke="#2563eb"
          strokeWidth={1.25}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </svg>
  );
};
