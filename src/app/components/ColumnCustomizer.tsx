import { useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { X, GripVertical, Search, Save } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

interface Column {
  id: string;
  label: string;
  category: string;
}

interface ColumnCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allColumns: Column[];
  visibleColumns: string[];
  onSaveColumns: (columns: string[]) => void;
  onSavePreset?: (name: string, columns: string[]) => void;
}

const ITEM_TYPE = "COLUMN";

interface DraggableColumnItemProps {
  column: Column;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (columnId: string) => void;
}

function DraggableColumnItem({ column, index, moveColumn, onRemove }: DraggableColumnItemProps) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveColumn(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div ref={drag} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
        <span className="text-sm text-gray-900">{column.label}</span>
      </div>
      <button
        onClick={() => onRemove(column.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ColumnCustomizer({
  open,
  onOpenChange,
  allColumns,
  visibleColumns,
  onSaveColumns,
  onSavePreset,
}: ColumnCustomizerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Update selected columns when visibleColumns prop changes
  useEffect(() => {
    setSelectedColumns(visibleColumns);
  }, [visibleColumns]);

  // Group columns by category
  const categorizedColumns = allColumns.reduce((acc, column) => {
    if (!acc[column.category]) {
      acc[column.category] = [];
    }
    acc[column.category].push(column);
    return acc;
  }, {} as Record<string, Column[]>);

  // Filter columns by search query
  const filteredCategories = Object.entries(categorizedColumns).reduce((acc, [category, columns]) => {
    const filtered = columns.filter(col =>
      col.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, Column[]>);

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const removeColumn = (columnId: string) => {
    setSelectedColumns(prev => prev.filter(id => id !== columnId));
  };

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const dragColumn = selectedColumns[dragIndex];
    const newColumns = [...selectedColumns];
    newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, dragColumn);
    setSelectedColumns(newColumns);
  };

  const handleSave = () => {
    onSaveColumns(selectedColumns);
    onOpenChange(false);
    setShowPresetInput(false);
    setPresetName("");
  };

  const handleSaveAsPreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), selectedColumns);
      onOpenChange(false);
      setShowPresetInput(false);
      setPresetName("");
    }
  };

  const handleCancel = () => {
    setSelectedColumns(visibleColumns);
    setShowPresetInput(false);
    setPresetName("");
    onOpenChange(false);
  };

  // Get selected columns in order with full details
  const orderedSelectedColumns = selectedColumns
    .map(id => allColumns.find(col => col.id === id))
    .filter(Boolean) as Column[];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:w-[400px] p-0 flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <SheetTitle>Customize Columns</SheetTitle>
            <SheetDescription>
              Select and reorder columns to customize your table.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 p-6 pt-4">
              {/* Search Bar */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search columns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Available Columns */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Columns</h3>
                <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {Object.entries(filteredCategories).map(([category, columns]) => (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {category}
                        </h4>
                        <div className="space-y-2 ml-2">
                          {columns.map(column => (
                            <div key={column.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`column-${column.id}`}
                                checked={selectedColumns.includes(column.id)}
                                onCheckedChange={() => toggleColumn(column.id)}
                                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                              />
                              <label
                                htmlFor={`column-${column.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {column.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Columns */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Selected Columns ({selectedColumns.length})
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 min-h-[450px]">
                  {orderedSelectedColumns.length > 0 ? (
                    orderedSelectedColumns.map((column, index) => (
                      <DraggableColumnItem
                        key={column.id}
                        column={column}
                        index={index}
                        moveColumn={moveColumn}
                        onRemove={removeColumn}
                      />
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No columns selected. Check some columns above to add them here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between w-full">
              {/* Left side - Save as Preset button */}
              <Button
                variant="ghost"
                className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 gap-2"
                onClick={() => setShowPresetInput(true)}
              >
                <Save className="w-4 h-4" />
                Save as Preset
              </Button>

              {/* Right side - Cancel and Save buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                  onClick={handleSave}
                >
                  Apply
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Preset Name Dialog */}
      <Dialog open={showPresetInput} onOpenChange={setShowPresetInput}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Preset</DialogTitle>
            <DialogDescription>
              Enter a name for your column preset. This will appear in "My Presets" in the column selector.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Enter preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && presetName.trim()) {
                  handleSaveAsPreset();
                }
              }}
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="ghost"
              className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
              onClick={() => {
                setShowPresetInput(false);
                setPresetName("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
              onClick={handleSaveAsPreset}
              disabled={!presetName.trim()}
            >
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}