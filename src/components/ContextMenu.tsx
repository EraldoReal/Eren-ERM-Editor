import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Check,
  Clipboard,
  Copy,
  Edit3,
  LayoutGrid,
  Link2,
  PlusSquare,
  Scissors,
  Trash2,
} from 'lucide-react';
import type { ErmCardinality } from '../model/types.ts';
import { useEditorStore } from '../store/editorStore.ts';
import { useTranslation } from '../store/i18n.ts';

export type ContextMenuTarget =
  | { kind: 'canvas'; canvasX: number; canvasY: number }
  | { kind: 'node'; nodeId: string }
  | { kind: 'edge'; edgeId: string };

export interface ContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  onClose: () => void;
}

const CHEN_CARDINALITIES: ErmCardinality[] = ['1', 'n', 'm', 'c', 'cn'];
const MINMAX_CARDINALITIES: ErmCardinality[] = ['(0,1)', '(1,1)', '(0,n)', '(1,n)', '(0,*)'];

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, target, onClose }) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  const activeTab = useEditorStore((s) => s.getActiveTab());
  const clipboard = useEditorStore((s) => s.clipboard);
  const addNode = useEditorStore((s) => s.addNode);
  const setSelection = useEditorStore((s) => s.setSelection);
  const selectAll = useEditorStore((s) => s.selectAll);
  const setEditingNodeId = useEditorStore((s) => s.setEditingNodeId);
  const toggleWeakEntity = useEditorStore((s) => s.toggleWeakEntity);
  const toggleIdentifyingRelationship = useEditorStore((s) => s.toggleIdentifyingRelationship);
  const toggleAttributeFlag = useEditorStore((s) => s.toggleAttributeFlag);
  const autoLayoutNodeAttributes = useEditorStore((s) => s.autoLayoutNodeAttributes);
  const updateEdge = useEditorStore((s) => s.updateEdge);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);
  const copySelection = useEditorStore((s) => s.copySelection);
  const cutSelection = useEditorStore((s) => s.cutSelection);
  const paste = useEditorStore((s) => s.paste);

  const doc = activeTab.document;
  const node = target.kind === 'node' ? doc.nodes.find((n) => n.id === target.nodeId) : undefined;
  const edge = target.kind === 'edge' ? doc.edges.find((e) => e.id === target.edgeId) : undefined;

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const clampedLeft = Math.min(x, window.innerWidth - rect.width - pad);
    const clampedTop = Math.min(y, window.innerHeight - rect.height - pad);
    setPos({
      left: Math.max(pad, clampedLeft),
      top: Math.max(pad, clampedTop),
    });
  }, [x, y]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const itemClass =
    'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70 transition-colors';

  // Keep an existing multi-selection if the clicked node is part of it; otherwise select just that node
  const ensureNodeInSelection = () => {
    if (!node) return;
    if (!useEditorStore.getState().selectedNodeIds.includes(node.id)) {
      setSelection([node.id]);
    }
  };

  const handleDuplicateNode = () => {
    if (!node) return;
    // Duplicating must not overwrite what the user has copied to the app clipboard
    const previousClipboard = useEditorStore.getState().clipboard;
    ensureNodeInSelection();
    copySelection();
    paste(24, 24);
    useEditorStore.setState({ clipboard: previousClipboard });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 min-w-[220px] rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {target.kind === 'canvas' && (
        <>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              const created = addNode('entity', target.canvasX - 70, target.canvasY - 32);
              setSelection([created.id]);
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <PlusSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              {t('canvas.addEntity')}
            </span>
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              const created = addNode('relationship', target.canvasX - 70, target.canvasY - 40);
              setSelection([created.id]);
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <PlusSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {t('canvas.addRelationship')}
            </span>
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              const created = addNode('attribute', target.canvasX - 65, target.canvasY - 26);
              setSelection([created.id]);
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <PlusSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              {t('canvas.addAttribute')}
            </span>
          </button>

          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          <button
            type="button"
            disabled={!clipboard || clipboard.nodes.length === 0}
            className={`${itemClass} disabled:opacity-40 disabled:pointer-events-none`}
            onClick={() => {
              paste(20, 20);
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <Clipboard className="h-3.5 w-3.5" />
              {t('menu.edit.paste')}
            </span>
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              selectAll();
              onClose();
            }}
          >
            <span>{t('menu.edit.selectAll')}</span>
          </button>
        </>
      )}

      {target.kind === 'node' && node && (
        <>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setSelection([node.id]);
              setEditingNodeId(node.id);
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5" />
              {t('canvas.editLabel')}
            </span>
            <span className="text-[10px] text-slate-400">F2</span>
          </button>

          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          {node.type === 'entity' && (
            <>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  toggleWeakEntity(node.id);
                  onClose();
                }}
              >
                <span>{t('action.weakEntity')}</span>
                {node.isWeak && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
              </button>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  autoLayoutNodeAttributes(node.id);
                  onClose();
                }}
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {t('canvas.autoLayout')}
                </span>
              </button>
            </>
          )}

          {node.type === 'relationship' && (
            <>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  toggleIdentifyingRelationship(node.id);
                  onClose();
                }}
              >
                <span>{t('action.identifyingRelationship')}</span>
                {node.isIdentifying && (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  autoLayoutNodeAttributes(node.id);
                  onClose();
                }}
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {t('canvas.autoLayout')}
                </span>
              </button>
            </>
          )}

          {node.type === 'attribute' && (
            <>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  toggleAttributeFlag(node.id, 'isPrimaryKey');
                  onClose();
                }}
              >
                <span>{t('action.primaryKey')}</span>
                {node.isPrimaryKey && (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  toggleAttributeFlag(node.id, 'isForeignKey');
                  onClose();
                }}
              >
                <span>{t('action.foreignKey')}</span>
                {node.isForeignKey && (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  toggleAttributeFlag(node.id, 'isMultivalued');
                  onClose();
                }}
              >
                <span>{t('action.multivalued')}</span>
                {node.isMultivalued && (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  toggleAttributeFlag(node.id, 'isDerived');
                  onClose();
                }}
              >
                <span>{t('action.derived')}</span>
                {node.isDerived && (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            </>
          )}

          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          <button
            type="button"
            className={itemClass}
            onClick={() => {
              ensureNodeInSelection();
              cutSelection();
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <Scissors className="h-3.5 w-3.5" />
              {t('menu.edit.cut')}
            </span>
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              ensureNodeInSelection();
              copySelection();
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5" />
              {t('menu.edit.copy')}
            </span>
          </button>
          <button type="button" className={itemClass} onClick={handleDuplicateNode}>
            <span className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5" />
              {t('canvas.duplicate')}
            </span>
          </button>

          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          <button
            type="button"
            className={`${itemClass} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50`}
            onClick={() => {
              ensureNodeInSelection();
              deleteSelection();
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              {t('canvas.delete')}
            </span>
          </button>
        </>
      )}

      {target.kind === 'edge' && edge && (
        <>
          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t('cardinality.label')} (Chen)
          </div>
          <div className="grid grid-cols-6 gap-1 px-2 pb-1.5">
            {(['', ...CHEN_CARDINALITIES] as ErmCardinality[]).map((card) => (
              <button
                key={card || 'none'}
                type="button"
                className={`rounded px-1.5 py-1 text-center text-xs font-medium transition-colors ${
                  edge.cardinality === card
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
                onClick={() => {
                  updateEdge(edge.id, { cardinality: card });
                  onClose();
                }}
              >
                {card || '–'}
              </button>
            ))}
          </div>

          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t('cardinality.label')} (Min-Max)
          </div>
          <div className="grid grid-cols-3 gap-1 px-2 pb-1.5">
            {MINMAX_CARDINALITIES.map((card) => (
              <button
                key={card}
                type="button"
                className={`rounded px-1.5 py-1 text-center text-xs font-medium transition-colors ${
                  edge.cardinality === card
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
                onClick={() => {
                  updateEdge(edge.id, { cardinality: card });
                  onClose();
                }}
              >
                {card}
              </button>
            ))}
          </div>

          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          <button
            type="button"
            className={itemClass}
            onClick={() => {
              updateEdge(edge.id, { isTotalParticipation: !edge.isTotalParticipation });
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5" />
              {t('edge.totalParticipation')}
            </span>
            {edge.isTotalParticipation && (
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            )}
          </button>

          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          <button
            type="button"
            className={`${itemClass} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50`}
            onClick={() => {
              setSelection([], [edge.id]);
              deleteSelection();
              onClose();
            }}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              {t('canvas.delete')}
            </span>
          </button>
        </>
      )}
    </div>
  );
};
