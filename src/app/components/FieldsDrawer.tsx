import { useState, useEffect, useRef } from "react";
import { X, Search, GripVertical, Check } from "lucide-react";
import { Input } from "@/app/components/ui/input";

interface Column {
  id: string;
  label: string;
  category: string;
}

interface FieldsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allColumns: Column[];
  visibleColumns: string[];
  onSaveColumns: (columns: string[]) => void;
  onSavePreset?: (name: string, columns: string[]) => void;
}

const REORDER_ITEM = "FIELD_REORDER";

export function FieldsDrawer({
  open,
  onOpenChange,
  allColumns,
  visibleColumns,
  onSaveColumns,
}: FieldsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // selectedColumns preserves user-defined order
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    setSelectedColumns([...visibleColumns]);
  }, [visibleColumns]);

  useEffect(() => {
    if (open) setSearchQuery("");
  }, [open]);

  // Group columns by category
  const categorizedColumns = allColumns.reduce((acc, col) => {
    if (!acc[col.category]) acc[col.category] = [];
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, Column[]>);

  const filterColumns = (columns: Column[]) => {
    if (!searchQuery) return columns;
    return columns.filter((col) =>
      col.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const toggleColumn = (columnId: string) => {
    if (selectedColumns.includes(columnId)) {
      setSelectedColumns(selectedColumns.filter((id) => id !== columnId));
    } else {
      setSelectedColumns([...selectedColumns, columnId]);
    }
  };

  const removeColumn = (columnId: string) => {
    setSelectedColumns(selectedColumns.filter((id) => id !== columnId));
  };

  const handleDone = () => {
    if (selectedColumns.length === 0) return;
    onSaveColumns(selectedColumns);
    onOpenChange(false);
  };

  // Native drag reorder for selected columns
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newCols = [...selectedColumns];
    const [dragged] = newCols.splice(dragIdx, 1);
    newCols.splice(idx, 0, dragged);
    setSelectedColumns(newCols);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // Get column objects for selected in order
  const selectedColumnObjects = selectedColumns
    .map((id) => allColumns.find((c) => c.id === id))
    .filter(Boolean) as Column[];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={() => onOpenChange(false)}
      />

      {/* Side Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[420px] bg-background z-50 flex flex-col animate-in slide-in-from-right duration-300"
        style={{ boxShadow: 'var(--elevation-sm)', fontFamily: 'var(--font-family-inter)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2
            className="text-foreground tracking-wide uppercase"
            style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.05em' }}
          >
            Columns
          </h2>
          <button
            onClick={handleDone}
            disabled={selectedColumns.length === 0}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
          >
            <span>+</span>
            <span>Done</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-input-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              style={{ fontFamily: 'var(--font-family-inter)', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Checkbox selection by category */}
          {Object.entries(categorizedColumns).map(([category, columns]) => {
            const filtered = filterColumns(columns);
            if (filtered.length === 0) return null;
            return (
              <div key={category} className="mb-1">
                <div className="px-5 py-2">
                  <span
                    className="text-primary uppercase tracking-wider"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', letterSpacing: '0.06em' }}
                  >
                    {category}
                  </span>
                </div>
                <div className="px-5">
                  {filtered.map((col) => {
                    const isChecked = selectedColumns.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        className="flex items-center gap-3 w-full py-2 cursor-pointer group/check"
                        onClick={() => toggleColumn(col.id)}
                      >
                        <span
                          className={`flex items-center justify-center w-5 h-5 shrink-0 transition-colors ${
                            isChecked
                              ? "bg-primary"
                              : "border-2 border-border bg-input-background group-hover/check:border-primary/50"
                          }`}
                          style={{ borderRadius: 'var(--radius)' }}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />}
                        </span>
                        <span
                          className="text-foreground"
                          style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-normal)' }}
                        >
                          {col.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Divider */}
          {selectedColumnObjects.length > 0 && (
            <div className="mx-5 my-3 border-t border-border" />
          )}

          {/* Reorder section — selected columns as draggable cards */}
          {selectedColumnObjects.length > 0 && (
            <div className="px-5 pb-6 flex flex-col gap-2">
              {selectedColumnObjects.map((col, idx) => (
                <div
                  key={col.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-3 py-3 bg-card border border-border transition-all ${
                    dragIdx === idx ? "opacity-40 scale-[0.98]" : "opacity-100"
                  }`}
                  style={{ borderRadius: 'var(--radius-card)', cursor: 'grab' }}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  <span
                    className="flex-1 text-foreground"
                    style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
                  >
                    {col.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColumn(col.id);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
