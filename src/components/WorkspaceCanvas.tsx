import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Edit3,
  KeyRound,
  LayoutGrid,
  Link2,
  Maximize2,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import { getNodeAnchorPoint, getNodeCenter, isValidErmConnection } from '../engine/geometry.ts';
import { GRID_SIZE, MAX_ZOOM, MIN_ZOOM } from '../model/defaults.ts';
import type { ErmCardinality, ErmEdge, ErmNode } from '../model/types.ts';
import { useEditorStore } from '../store/editorStore.ts';
import { useTranslation } from '../store/i18n.ts';
import { ContextMenu, type ContextMenuTarget } from './ContextMenu.tsx';
import {
  ErmSvgCanvas,
  WORKSPACE_HEIGHT,
  WORKSPACE_WIDTH,
  type MarqueeBox,
  type PreviewEdgeState,
} from './ErmSvgCanvas.tsx';

export interface WorkspaceCanvasProps {
  darkMode: boolean;
}

const CHEN_OPTIONS: ErmCardinality[] = ['1', 'n', 'm', 'c', 'cn'];
const MINMAX_OPTIONS: ErmCardinality[] = ['(0,1)', '(1,1)', '(0,n)', '(1,n)', '(0,*)'];

type InteractionState =
  | { mode: 'idle' }
  | {
      mode: 'pan';
      startClientX: number;
      startClientY: number;
      startPanX: number;
      startPanY: number;
    }
  | {
      mode: 'drag-nodes';
      startCanvasX: number;
      startCanvasY: number;
      initialPositions: Array<{ id: string; x: number; y: number; width: number; height: number }>;
      hasMoved: boolean;
    }
  | {
      mode: 'marquee';
      startCanvasX: number;
      startCanvasY: number;
      currentCanvasX: number;
      currentCanvasY: number;
    }
  | {
      mode: 'connect';
      sourceNodeId: string;
      cursorX: number;
      cursorY: number;
    };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snapValue(value: number, enabled: boolean): number {
  return enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({ darkMode }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const cancelledEditRef = useRef(false);

  const activeTab = useEditorStore((s) => s.getActiveTab());
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useEditorStore((s) => s.selectedEdgeIds);
  const activeTool = useEditorStore((s) => s.activeTool);
  const editingNodeId = useEditorStore((s) => s.editingNodeId);

  const setSelection = useEditorStore((s) => s.setSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setEditingNodeId = useEditorStore((s) => s.setEditingNodeId);
  const addNode = useEditorStore((s) => s.addNode);
  const moveNodes = useEditorStore((s) => s.moveNodes);
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const toggleWeakEntity = useEditorStore((s) => s.toggleWeakEntity);
  const toggleIdentifyingRelationship = useEditorStore((s) => s.toggleIdentifyingRelationship);
  const toggleAttributeFlag = useEditorStore((s) => s.toggleAttributeFlag);
  const autoLayoutNodeAttributes = useEditorStore((s) => s.autoLayoutNodeAttributes);
  const addEdge = useEditorStore((s) => s.addEdge);
  const updateEdge = useEditorStore((s) => s.updateEdge);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const pushUndoSnapshot = useEditorStore((s) => s.pushUndoSnapshot);
  const showToast = useEditorStore((s) => s.showToast);

  const doc = activeTab.document;

  const [interaction, setInteraction] = useState<InteractionState>({ mode: 'idle' });
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextMenuTarget;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 700 });

  // Track container dimensions for scrollbar thumbs
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync draft label when entering inline edit mode
  const editingNode = useMemo(
    () => (editingNodeId ? doc.nodes.find((n) => n.id === editingNodeId) ?? null : null),
    [doc.nodes, editingNodeId],
  );

  useEffect(() => {
    if (editingNode) {
      cancelledEditRef.current = false;
      setDraftLabel(editingNode.label);
      window.requestAnimationFrame(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      });
    }
  }, [editingNode?.id]);

  const commitInlineEdit = useCallback(() => {
    if (!editingNodeId) return;
    if (cancelledEditRef.current) {
      cancelledEditRef.current = false;
      return;
    }
    const trimmed = draftLabel.trim();
    if (trimmed.length > 0) {
      updateNodeLabel(editingNodeId, trimmed);
    }
    setEditingNodeId(null);
  }, [draftLabel, editingNodeId, setEditingNodeId, updateNodeLabel]);

  const cancelInlineEdit = useCallback(() => {
    cancelledEditRef.current = true;
    setEditingNodeId(null);
  }, [setEditingNodeId]);

  // Convert client pointer coordinates to workspace canvas coordinates
  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - doc.panX) / doc.zoom,
        y: (clientY - rect.top - doc.panY) / doc.zoom,
      };
    },
    [doc.panX, doc.panY, doc.zoom],
  );

  // Clamp pan so workspace stays reachable
  const clampPan = useCallback(
    (panX: number, panY: number, zoom: number) => {
      const scaledW = WORKSPACE_WIDTH * zoom;
      const scaledH = WORKSPACE_HEIGHT * zoom;
      const minX = Math.min(0, viewportSize.width - scaledW - 40);
      const minY = Math.min(0, viewportSize.height - scaledH - 40);
      return {
        x: clamp(panX, minX, 40),
        y: clamp(panY, minY, 40),
      };
    },
    [viewportSize.height, viewportSize.width],
  );

  // Keyboard shortcuts: Space pan, F2 edit, Delete/Backspace, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (e.key === 'F2' && selectedNodeIds.length === 1 && !editingNodeId) {
        e.preventDefault();
        setEditingNodeId(selectedNodeIds[0]);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !editingNodeId) {
        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          e.preventDefault();
          deleteSelection();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (interaction.mode === 'connect') {
          setInteraction({ mode: 'idle' });
          setHoveredTargetNodeId(null);
        } else if (activeTool !== 'select') {
          setActiveTool('select');
        } else {
          clearSelection();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    // Releasing Space while the window is unfocused would otherwise leave pan mode stuck
    const handleBlur = () => setIsSpacePressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    activeTool,
    clearSelection,
    deleteSelection,
    editingNodeId,
    interaction.mode,
    selectedEdgeIds.length,
    selectedNodeIds,
    setActiveTool,
    setEditingNodeId,
  ]);

  // Wheel: Ctrl/Cmd + wheel zooms at cursor; normal wheel pans
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const nextZoom = clamp(Number((doc.zoom * zoomFactor).toFixed(3)), MIN_ZOOM, MAX_ZOOM);
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;
        const canvasX = (pointerX - doc.panX) / doc.zoom;
        const canvasY = (pointerY - doc.panY) / doc.zoom;
        const nextPanX = pointerX - canvasX * nextZoom;
        const nextPanY = pointerY - canvasY * nextZoom;
        const clamped = clampPan(nextPanX, nextPanY, nextZoom);
        setZoom(nextZoom);
        setPan(clamped.x, clamped.y);
      } else {
        const clamped = clampPan(doc.panX - e.deltaX, doc.panY - e.deltaY, doc.zoom);
        setPan(clamped.x, clamped.y);
      }
    },
    [clampPan, doc.panX, doc.panY, doc.zoom, setPan, setZoom],
  );

  // React registers wheel listeners as passive, so preventDefault would be ignored.
  // Attach a native, non-passive listener instead.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Canvas pointer down (pan, place node, or marquee)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setContextMenu(null);

    // Middle mouse or Space+left click -> pan
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setInteraction({
        mode: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: doc.panX,
        startPanY: doc.panY,
      });
      return;
    }

    if (e.button !== 0) return;

    const pt = clientToCanvas(e.clientX, e.clientY);

    if (activeTool === 'entity' || activeTool === 'relationship' || activeTool === 'attribute') {
      const dims =
        activeTool === 'entity'
          ? { w: 140, h: 64 }
          : activeTool === 'relationship'
            ? { w: 140, h: 80 }
            : { w: 130, h: 52 };
      const x = clamp(snapValue(pt.x - dims.w / 2, doc.snapToGrid), 0, WORKSPACE_WIDTH - dims.w);
      const y = clamp(snapValue(pt.y - dims.h / 2, doc.snapToGrid), 0, WORKSPACE_HEIGHT - dims.h);
      const created = addNode(activeTool, x, y);
      setSelection([created.id]);
      if (!e.shiftKey) {
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'connect') {
      setInteraction({ mode: 'idle' });
      setHoveredTargetNodeId(null);
      return;
    }

    // Select tool on empty canvas:
    // - Shift + drag -> marquee selection box
    // - Normal left-drag -> pan around the canvas (and deselect on click)
    if (e.shiftKey) {
      setInteraction({
        mode: 'marquee',
        startCanvasX: pt.x,
        startCanvasY: pt.y,
        currentCanvasX: pt.x,
        currentCanvasY: pt.y,
      });
      return;
    }

    clearSelection();
    setInteraction({
      mode: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: doc.panX,
      startPanY: doc.panY,
    });
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only create on empty canvas double click (node double-click stops propagation)
    if (activeTool !== 'select' || isSpacePressed) return;
    const pt = clientToCanvas(e.clientX, e.clientY);
    const x = clamp(snapValue(pt.x - 70, doc.snapToGrid), 0, WORKSPACE_WIDTH - 140);
    const y = clamp(snapValue(pt.y - 32, doc.snapToGrid), 0, WORKSPACE_HEIGHT - 64);
    const created = addNode('entity', x, y);
    setSelection([created.id]);
    setEditingNodeId(created.id);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pt = clientToCanvas(e.clientX, e.clientY);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: { kind: 'canvas', canvasX: pt.x, canvasY: pt.y },
    });
  };

  // Node pointer interactions
  const handleNodePointerDown = (e: React.PointerEvent<SVGGElement>, node: ErmNode) => {
    e.stopPropagation();
    setContextMenu(null);

    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setInteraction({
        mode: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: doc.panX,
        startPanY: doc.panY,
      });
      return;
    }

    if (e.button !== 0) return;

    const pt = clientToCanvas(e.clientX, e.clientY);

    if (activeTool === 'connect') {
      if (interaction.mode === 'connect') {
        // Second click completes connection
        const sourceNode = doc.nodes.find((n) => n.id === interaction.sourceNodeId);
        if (sourceNode && sourceNode.id !== node.id) {
          if (isValidErmConnection(sourceNode, node)) {
            const created = addEdge(sourceNode.id, node.id, '');
            if (created) {
              setSelection([], [created.id]);
            }
          } else {
            showToast(t('canvas.invalidConnection'), 'error');
          }
        }
        setInteraction({ mode: 'idle' });
        setHoveredTargetNodeId(null);
      } else {
        setSelection([node.id]);
        setInteraction({
          mode: 'connect',
          sourceNodeId: node.id,
          cursorX: pt.x,
          cursorY: pt.y,
        });
      }
      return;
    }

    // Select / drag nodes
    let nextSelected = selectedNodeIds;
    if (e.shiftKey) {
      nextSelected = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id];
      setSelection(nextSelected, []);
    } else if (!selectedNodeIds.includes(node.id)) {
      nextSelected = [node.id];
      setSelection(nextSelected, []);
    }

    const initialPositions = doc.nodes
      .filter((n) => nextSelected.includes(n.id))
      .map((n) => ({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height }));

    setInteraction({
      mode: 'drag-nodes',
      startCanvasX: pt.x,
      startCanvasY: pt.y,
      initialPositions,
      hasMoved: false,
    });
  };

  const handleNodeDoubleClick = (e: React.MouseEvent<SVGGElement>, node: ErmNode) => {
    e.stopPropagation();
    setSelection([node.id], []);
    setEditingNodeId(node.id);
  };

  const handleNodeContextMenu = (e: React.MouseEvent<SVGGElement>, node: ErmNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedNodeIds.includes(node.id)) {
      setSelection([node.id], []);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: { kind: 'node', nodeId: node.id },
    });
  };

  const handleHandlePointerDown = (e: React.PointerEvent<SVGCircleElement>, node: ErmNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const pt = clientToCanvas(e.clientX, e.clientY);
    setInteraction({
      mode: 'connect',
      sourceNodeId: node.id,
      cursorX: pt.x,
      cursorY: pt.y,
    });
  };

  const handleEdgePointerDown = (e: React.PointerEvent<SVGGElement>, edge: ErmEdge) => {
    e.stopPropagation();
    setContextMenu(null);
    if (e.button !== 0) return;
    setSelection([], [edge.id]);
  };

  const handleEdgeContextMenu = (e: React.MouseEvent<SVGGElement>, edge: ErmEdge) => {
    e.preventDefault();
    e.stopPropagation();
    setSelection([], [edge.id]);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: { kind: 'edge', edgeId: edge.id },
    });
  };

  // Global pointer move / up for smooth dragging even outside SVG bounds
  useEffect(() => {
    if (interaction.mode === 'idle') return;

    const handlePointerMove = (e: PointerEvent) => {
      if (interaction.mode === 'pan') {
        const dx = e.clientX - interaction.startClientX;
        const dy = e.clientY - interaction.startClientY;
        const clamped = clampPan(interaction.startPanX + dx, interaction.startPanY + dy, doc.zoom);
        setPan(clamped.x, clamped.y);
        return;
      }

      const pt = clientToCanvas(e.clientX, e.clientY);

      if (interaction.mode === 'drag-nodes') {
        const dx = pt.x - interaction.startCanvasX;
        const dy = pt.y - interaction.startCanvasY;
        if (!interaction.hasMoved && Math.hypot(dx, dy) < 2) return;

        if (!interaction.hasMoved) {
          pushUndoSnapshot();
          setInteraction((prev) =>
            prev.mode === 'drag-nodes' ? { ...prev, hasMoved: true } : prev,
          );
        }

        const moves = interaction.initialPositions.map((item) => ({
          id: item.id,
          x: clamp(
            snapValue(item.x + dx, doc.snapToGrid),
            0,
            WORKSPACE_WIDTH - item.width,
          ),
          y: clamp(
            snapValue(item.y + dy, doc.snapToGrid),
            0,
            WORKSPACE_HEIGHT - item.height,
          ),
        }));
        moveNodes(moves, false);
        return;
      }

      if (interaction.mode === 'marquee') {
        setInteraction((prev) =>
          prev.mode === 'marquee'
            ? { ...prev, currentCanvasX: pt.x, currentCanvasY: pt.y }
            : prev,
        );
        return;
      }

      if (interaction.mode === 'connect') {
        setInteraction((prev) =>
          prev.mode === 'connect' ? { ...prev, cursorX: pt.x, cursorY: pt.y } : prev,
        );
      }
    };

    const handlePointerUp = () => {
      if (interaction.mode === 'marquee') {
        const x = Math.min(interaction.startCanvasX, interaction.currentCanvasX);
        const y = Math.min(interaction.startCanvasY, interaction.currentCanvasY);
        const w = Math.abs(interaction.currentCanvasX - interaction.startCanvasX);
        const h = Math.abs(interaction.currentCanvasY - interaction.startCanvasY);
        if (w > 4 || h > 4) {
          const hitIds = doc.nodes
            .filter(
              (n) =>
                n.x < x + w &&
                n.x + n.width > x &&
                n.y < y + h &&
                n.y + n.height > y,
            )
            .map((n) => n.id);
          setSelection(hitIds, []);
        }
      }

      if (interaction.mode === 'connect') {
        if (hoveredTargetNodeId && hoveredTargetNodeId !== interaction.sourceNodeId) {
          const sourceNode = doc.nodes.find((n) => n.id === interaction.sourceNodeId);
          const targetNode = doc.nodes.find((n) => n.id === hoveredTargetNodeId);
          if (sourceNode && targetNode) {
            if (isValidErmConnection(sourceNode, targetNode)) {
              const created = addEdge(sourceNode.id, targetNode.id, '');
              if (created) {
                setSelection([], [created.id]);
              }
            } else {
              showToast(t('canvas.invalidConnection'), 'error');
            }
          }
          setInteraction({ mode: 'idle' });
          setHoveredTargetNodeId(null);
          return;
        }

        // If user used 'connect' tool and just clicked source node (didn't drag onto target), keep connect mode active
        if (activeTool === 'connect') {
          return;
        }
      }

      setInteraction({ mode: 'idle' });
      setHoveredTargetNodeId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    activeTool,
    addEdge,
    clampPan,
    clientToCanvas,
    doc.nodes,
    doc.snapToGrid,
    doc.zoom,
    hoveredTargetNodeId,
    interaction,
    moveNodes,
    pushUndoSnapshot,
    setPan,
    setSelection,
    showToast,
    t,
  ]);

  // Compute preview edge & target validity
  const connectSourceNode =
    interaction.mode === 'connect'
      ? doc.nodes.find((n) => n.id === interaction.sourceNodeId) ?? null
      : null;

  const hoveredTargetNode = hoveredTargetNodeId
    ? doc.nodes.find((n) => n.id === hoveredTargetNodeId) ?? null
    : null;

  const hoveredTargetValid =
    connectSourceNode && hoveredTargetNode && hoveredTargetNode.id !== connectSourceNode.id
      ? isValidErmConnection(connectSourceNode, hoveredTargetNode)
      : null;

  const previewEdge: PreviewEdgeState | null = useMemo(() => {
    if (interaction.mode !== 'connect' || !connectSourceNode) return null;
    const p1 = getNodeAnchorPoint(connectSourceNode, interaction.cursorX, interaction.cursorY);
    let p2 = { x: interaction.cursorX, y: interaction.cursorY };
    if (hoveredTargetNode && hoveredTargetNode.id !== connectSourceNode.id) {
      const srcCenter = getNodeCenter(connectSourceNode);
      p2 = getNodeAnchorPoint(hoveredTargetNode, srcCenter.x, srcCenter.y);
    }
    return {
      sourceNodeId: connectSourceNode.id,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      isValid: hoveredTargetValid,
    };
  }, [connectSourceNode, hoveredTargetNode, hoveredTargetValid, interaction]);

  const marqueeBox: MarqueeBox | null =
    interaction.mode === 'marquee'
      ? {
          x: Math.min(interaction.startCanvasX, interaction.currentCanvasX),
          y: Math.min(interaction.startCanvasY, interaction.currentCanvasY),
          width: Math.abs(interaction.currentCanvasX - interaction.startCanvasX),
          height: Math.abs(interaction.currentCanvasY - interaction.startCanvasY),
        }
      : null;

  // Selected single node or edge for quick-action floating bar
  const selectedSingleNode =
    selectedNodeIds.length === 1 && selectedEdgeIds.length === 0
      ? doc.nodes.find((n) => n.id === selectedNodeIds[0]) ?? null
      : null;

  const selectedSingleEdge =
    selectedEdgeIds.length === 1 && selectedNodeIds.length === 0
      ? doc.edges.find((e) => e.id === selectedEdgeIds[0]) ?? null
      : null;

  const cursorClass =
    interaction.mode === 'pan'
      ? 'cursor-grabbing'
      : isSpacePressed
        ? 'cursor-grab active:cursor-grabbing'
        : activeTool === 'connect' || interaction.mode === 'connect'
          ? 'cursor-crosshair'
          : activeTool !== 'select'
            ? 'cursor-copy'
            : 'cursor-grab';

  const scaledW = WORKSPACE_WIDTH * doc.zoom;
  const scaledH = WORKSPACE_HEIGHT * doc.zoom;
  const hThumbRatio = clamp(viewportSize.width / scaledW, 0.08, 1);
  const vThumbRatio = clamp(viewportSize.height / scaledH, 0.08, 1);
  const hScrollProgress = scaledW > viewportSize.width ? clamp(-doc.panX / (scaledW - viewportSize.width), 0, 1) : 0;
  const vScrollProgress = scaledH > viewportSize.height ? clamp(-doc.panY / (scaledH - viewportSize.height), 0, 1) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950 ${cursorClass}`}
      onPointerDown={handleCanvasPointerDown}
      onDoubleClick={handleCanvasDoubleClick}
      onContextMenu={handleCanvasContextMenu}
    >
      {/* Transformed 4000x3000 workspace */}
      <div
        style={{
          width: WORKSPACE_WIDTH,
          height: WORKSPACE_HEIGHT,
          transform: `translate(${doc.panX}px, ${doc.panY}px) scale(${doc.zoom})`,
          transformOrigin: '0 0',
        }}
        className="relative shadow-sm"
      >
        <ErmSvgCanvas
          document={doc}
          darkMode={darkMode}
          selectedNodeIds={selectedNodeIds}
          selectedEdgeIds={selectedEdgeIds}
          editingNodeId={editingNodeId}
          connectingFromNodeId={interaction.mode === 'connect' ? interaction.sourceNodeId : null}
          hoveredTargetNodeId={hoveredTargetNodeId}
          hoveredTargetValid={hoveredTargetValid}
          previewEdge={previewEdge}
          marqueeBox={marqueeBox}
          onNodePointerDown={handleNodePointerDown}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          onNodePointerEnter={(node) => {
            if (interaction.mode === 'connect' && node.id !== interaction.sourceNodeId) {
              setHoveredTargetNodeId(node.id);
            }
          }}
          onNodePointerLeave={(node) => {
            if (hoveredTargetNodeId === node.id) {
              setHoveredTargetNodeId(null);
            }
          }}
          onHandlePointerDown={handleHandlePointerDown}
          onEdgePointerDown={handleEdgePointerDown}
          onEdgeContextMenu={handleEdgeContextMenu}
        />
      </div>

      {/* Inline text editor overlay (saves on blur & Enter, cancels on Escape) */}
      {editingNode && (
        <div
          style={{
            left: doc.panX + editingNode.x * doc.zoom,
            top: doc.panY + editingNode.y * doc.zoom,
            width: editingNode.width * doc.zoom,
            height: editingNode.height * doc.zoom,
          }}
          className="pointer-events-auto absolute z-30 flex items-center justify-center p-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            ref={editInputRef}
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onBlur={commitInlineEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitInlineEdit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelInlineEdit();
              }
            }}
            className="w-full rounded border-2 border-blue-500 bg-white px-2 py-1 text-center text-sm font-medium text-slate-900 shadow-md outline-none dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      )}

      {/* Empty state hint */}
      {doc.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-dashed border-slate-300 bg-white/85 px-5 py-4 text-center text-xs leading-relaxed text-slate-500 backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-400">
            {t('canvas.emptyHint')}
          </div>
        </div>
      )}

      {/* Connect mode banner */}
      {activeTool === 'connect' && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-blue-200 bg-blue-50/95 px-3.5 py-1 text-xs font-medium text-blue-700 shadow-sm dark:border-blue-800 dark:bg-blue-950/90 dark:text-blue-300">
          {t('canvas.connectHint')}
        </div>
      )}

      {/* Quick-action floating bar for selected node or edge */}
      {!editingNode && (selectedSingleNode || selectedSingleEdge) && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="no-print absolute top-3 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-lg backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/95"
        >
          {selectedSingleNode && (
            <>
              <span className="px-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t(`node.${selectedSingleNode.type}`)}
              </span>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              {selectedSingleNode.type === 'entity' && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleWeakEntity(selectedSingleNode.id)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      selectedSingleNode.isWeak
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t('action.weakEntity')}
                  </button>
                  <button
                    type="button"
                    onClick={() => autoLayoutNodeAttributes(selectedSingleNode.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {t('canvas.autoLayout')}
                  </button>
                </>
              )}

              {selectedSingleNode.type === 'relationship' && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleIdentifyingRelationship(selectedSingleNode.id)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      selectedSingleNode.isIdentifying
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t('action.identifyingRelationship')}
                  </button>
                  <button
                    type="button"
                    onClick={() => autoLayoutNodeAttributes(selectedSingleNode.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {t('canvas.autoLayout')}
                  </button>
                </>
              )}

              {selectedSingleNode.type === 'attribute' && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleAttributeFlag(selectedSingleNode.id, 'isPrimaryKey')}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      selectedSingleNode.isPrimaryKey
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <KeyRound className="h-3 w-3" />
                    PK
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAttributeFlag(selectedSingleNode.id, 'isForeignKey')}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      selectedSingleNode.isForeignKey
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    FK
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAttributeFlag(selectedSingleNode.id, 'isMultivalued')}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      selectedSingleNode.isMultivalued
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t('action.multivalued')}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAttributeFlag(selectedSingleNode.id, 'isDerived')}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      selectedSingleNode.isDerived
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t('action.derived')}
                  </button>
                </>
              )}

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                onClick={() => setEditingNodeId(selectedSingleNode.id)}
                title={t('canvas.editLabel')}
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={deleteSelection}
                title={t('canvas.delete')}
                className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {selectedSingleEdge && (
            <>
              <div className="flex items-center gap-1">
                {(doc.notationMode === 'chen'
                  ? [...CHEN_OPTIONS, ...MINMAX_OPTIONS]
                  : [...MINMAX_OPTIONS, ...CHEN_OPTIONS]
                ).map((card) => (
                  <button
                    key={card}
                    type="button"
                    onClick={() =>
                      updateEdge(selectedSingleEdge.id, {
                        cardinality: selectedSingleEdge.cardinality === card ? '' : card,
                      })
                    }
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                      selectedSingleEdge.cardinality === card
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {card}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              <button
                type="button"
                onClick={() =>
                  updateEdge(selectedSingleEdge.id, {
                    isTotalParticipation: !selectedSingleEdge.isTotalParticipation,
                  })
                }
                title={t('edge.totalParticipation')}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  selectedSingleEdge.isTotalParticipation
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>‖</span>
              </button>

              <input
                type="text"
                value={selectedSingleEdge.role ?? ''}
                placeholder={t('edge.rolePlaceholder')}
                onChange={(e) => updateEdge(selectedSingleEdge.id, { role: e.target.value })}
                className="w-28 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />

              <button
                type="button"
                onClick={deleteSelection}
                title={t('canvas.delete')}
                className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating zoom controls (bottom-left) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="no-print absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/95"
      >
        <button
          type="button"
          onClick={() => setZoom(clamp(Number((doc.zoom - 0.1).toFixed(2)), MIN_ZOOM, MAX_ZOOM))}
          title={t('menu.view.zoomOut')}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan(0, 0);
          }}
          title={t('menu.view.zoomReset')}
          className="min-w-[46px] rounded px-1.5 py-0.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {Math.round(doc.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoom(clamp(Number((doc.zoom + 0.1).toFixed(2)), MIN_ZOOM, MAX_ZOOM))}
          title={t('menu.view.zoomIn')}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan(0, 0);
          }}
          title={t('menu.view.zoomReset')}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Subtle scrollbar indicators */}
      {hThumbRatio < 1 && (
        <div className="pointer-events-none absolute right-3 bottom-1 left-3 h-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60">
          <div
            style={{
              width: `${hThumbRatio * 100}%`,
              left: `${hScrollProgress * (1 - hThumbRatio) * 100}%`,
            }}
            className="relative h-full rounded-full bg-slate-400/70 dark:bg-slate-600/70"
          />
        </div>
      )}
      {vThumbRatio < 1 && (
        <div className="pointer-events-none absolute top-3 right-1 bottom-3 w-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60">
          <div
            style={{
              height: `${vThumbRatio * 100}%`,
              top: `${vScrollProgress * (1 - vThumbRatio) * 100}%`,
            }}
            className="relative w-full rounded-full bg-slate-400/70 dark:bg-slate-600/70"
          />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
