'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Block, FieldDef } from '@/lib/blocks';
import { FieldEditor } from '@/components/builder/field-editor';

/**
 * One draggable row in the sections list. Dragging is scoped to the grip
 * handle (not the whole row) so the existing click-to-select / row buttons
 * keep working exactly as before — only the grip is a `useSortable` drag
 * source.
 */
export function SortableBlockRow({
  block,
  index,
  isLast,
  isSelected,
  isDropTarget,
  label,
  fields,
  onSelect,
  onToggleHidden,
  onMoveUp,
  onMoveDown,
  onRemove,
  onFieldChange,
}: {
  block: Block;
  index: number;
  isLast: boolean;
  isSelected: boolean;
  /** True when a dragged row is currently hovering over this one. */
  isDropTarget: boolean;
  label: string;
  fields: FieldDef[];
  onSelect: () => void;
  onToggleHidden: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onFieldChange: (key: string, value: unknown) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border bg-neutral-950 overflow-hidden transition-colors',
        block.hidden && 'opacity-50',
        isDropTarget ? 'border-brand ring-1 ring-brand' : 'border-neutral-800',
      )}
    >
      <div
        onClick={onSelect}
        className={cn(
          'flex items-center justify-between p-3 cursor-pointer group transition-colors',
          isSelected ? 'bg-neutral-900' : 'hover:bg-neutral-900/60',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="p-1 -ml-1 rounded text-neutral-600 hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            aria-label={`Reorder ${label}`}
          >
            <GripVertical className="h-4 w-4 shrink-0" />
          </button>
          <span className="text-sm font-medium text-neutral-200 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden();
            }}
            className="p-1 rounded text-neutral-500 hover:text-foreground"
            title={block.hidden ? 'Hidden — click to show' : 'Visible — click to hide'}
          >
            {block.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            className="p-1 rounded text-neutral-500 hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            className="p-1 rounded text-neutral-500 hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded text-neutral-500 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronRight className={cn('h-4 w-4 text-neutral-600 transition-transform', isSelected && 'rotate-90')} />
        </div>
      </div>

      {isSelected && (
        <div className="p-3 pt-0 space-y-3 border-t border-neutral-800">
          {fields.map((field) => (
            <div key={field.key} className="pt-3">
              <FieldEditor field={field} value={block.props[field.key]} onChange={(v) => onFieldChange(field.key, v)} />
            </div>
          ))}
          {fields.length === 0 && <p className="text-xs text-neutral-500 pt-3">This section has no editable content — use the order/visibility controls above.</p>}
        </div>
      )}
    </div>
  );
}
