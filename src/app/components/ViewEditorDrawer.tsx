import { useState, useRef } from "react";
import { X, Plus, GripVertical, ArrowUp, ArrowDown, ChevronDown, Search, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { useDrag, useDrop } from "react-dnd";

export interface FilterRule {
  id: string;
  field: string;
  operator: string;
  values: string[];
}

interface Column {
  id: string;
  label: string;
  category: string;
}

interface ViewEditorDrawerProps {
  open: boolean;
  isEditing: boolean;
  isSystemView: boolean;
  viewName: string;
  onViewNameChange: (name: string) => void;
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  columns: string[];
  onColumnsChange: (columns: string[]) => void;
  sortColumn: string;
  onSortColumnChange: (col: string) => void;
  sortDirection: "asc" | "desc";
  onSortDirectionChange: (dir: "asc" | "desc") => void;
  allColumns: Column[];
  filterFieldLabels: Record<string, string>;
  fieldOperators: Record<string, string[]>;
  fieldInputTypes: Record<string, string>;
  filterOptions: Record<string, string[]>;
  onSave: () => void;
  onCancel: () => void;
}

const DRAWER_COLUMN_TYPE = "DRAWER_COLUMN";

function DraggableColumnRow({
  columnId,
  label,
  index,
  moveColumn,
  onRemove,
}: {
  columnId: string;
  label: string;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: DRAWER_COLUMN_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: DRAWER_COLUMN_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveColumn(item.index, index);
        item.index = index;
      }
    },
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div ref={drag} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FilterValueSelector({
  filter,
  options,
  inputType,
  onChange,
}: {
  filter: FilterRule;
  options: string[];
  inputType: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState(filter.values[0] || "");

  if (inputType === "dropdown" && options.length > 0) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors text-left min-h-[30px]">
            {filter.values.length > 0 ? (
              <span className="text-gray-700 truncate">
                {filter.values.length === 1 ? filter.values[0] : `${filter.values.length} selected`}
              </span>
            ) : (
              <span className="text-gray-400">Select values...</span>
            )}
            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <div className="py-1 max-h-[200px] overflow-y-auto">
            {options.map((opt) => {
              const isSelected = filter.values.includes(opt);
              return (
                <button
                  key={opt}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 text-left"
                  onClick={() => {
                    if (isSelected) {
                      onChange(filter.values.filter((v) => v !== opt));
                    } else {
                      onChange([...filter.values, opt]);
                    }
                  }}
                >
                  <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-gray-700">{opt}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <input
      type="text"
      value={textValue}
      onChange={(e) => {
        setTextValue(e.target.value);
        onChange(e.target.value ? [e.target.value] : []);
      }}
      placeholder="Enter value..."
      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#f26318] focus:border-[#f26318]"
    />
  );
}

export function ViewEditorDrawer({
  open,
  isEditing,
  isSystemView,
  viewName,
  onViewNameChange,
  filters,
  onFiltersChange,
  columns,
  onColumnsChange,
  sortColumn,
  onSortColumnChange,
  sortDirection,
  onSortDirectionChange,
  allColumns,
  filterFieldLabels,
  fieldOperators,
  fieldInputTypes,
  filterOptions,
  onSave,
  onCancel,
}: ViewEditorDrawerProps) {
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");

  if (!open) return null;

  // Filter field options for the "add filter" field selector
  const allFilterFields = Object.keys(filterFieldLabels);

  const addNewFilter = () => {
    onFiltersChange([
      ...filters,
      {
        id: `filter-${Date.now()}`,
        field: "",
        operator: "is",
        values: [],
      },
    ]);
  };

  const updateFilterField = (id: string, field: string) => {
    const defaultOperator = fieldOperators[field]?.[0] || "is";
    onFiltersChange(
      filters.map((f) =>
        f.id === id ? { ...f, field, operator: defaultOperator, values: [] } : f
      )
    );
  };

  const updateFilterOperator = (id: string, operator: string) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, operator } : f))
    );
  };

  const updateFilterValues = (id: string, values: string[]) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, values } : f))
    );
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const newCols = [...columns];
    const dragged = newCols[dragIndex];
    newCols.splice(dragIndex, 1);
    newCols.splice(hoverIndex, 0, dragged);
    onColumnsChange(newCols);
  };

  const removeColumn = (colId: string) => {
    onColumnsChange(columns.filter((id) => id !== colId));
  };

  const toggleColumn = (colId: string) => {
    if (columns.includes(colId)) {
      onColumnsChange(columns.filter((id) => id !== colId));
    } else {
      onColumnsChange([...columns, colId]);
    }
  };

  // Group available columns by category, filtering by search
  const categorizedAvailable = allColumns.reduce((acc, col) => {
    if (!col.label.toLowerCase().includes(columnSearchQuery.toLowerCase())) return acc;
    if (!acc[col.category]) acc[col.category] = [];
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, Column[]>);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onCancel}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[440px] bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit View" : "Create View"}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* View Name */}
          <div className="px-4 pt-4 pb-3">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              View Name
            </label>
            <Input
              type="text"
              placeholder="Enter view name"
              value={viewName}
              onChange={(e) => onViewNameChange(e.target.value)}
              className="w-full"
              disabled={isSystemView && isEditing}
            />
            {isSystemView && isEditing && (
              <p className="text-xs text-gray-400 mt-1">System view names cannot be changed</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mx-4" />

          {/* Filters Section */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Filters
              </label>
              <button
                onClick={addNewFilter}
                className="flex items-center gap-1 text-xs text-[#f26318] hover:text-[#d94f0e] font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add filter
              </button>
            </div>

            {filters.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-400">No filters configured</p>
                <button
                  onClick={addNewFilter}
                  className="mt-2 text-xs text-[#f26318] hover:text-[#d94f0e] font-medium"
                >
                  + Add your first filter
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filters.map((filter) => {
                  const fieldLabel = filterFieldLabels[filter.field] || "";
                  const operators = fieldOperators[filter.field] || [];
                  const inputType = fieldInputTypes[filter.field] || "text";
                  const options = filterOptions[filter.field] || [];

                  return (
                    <div
                      key={filter.id}
                      className="rounded-lg border border-gray-200 bg-white overflow-hidden"
                    >
                      <div className="flex items-start gap-1.5 p-2.5">
                        {/* Filter config */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Row 1: Field + Operator */}
                          <div className="flex items-center gap-1.5">
                            {/* Field selector */}
                            <select
                              value={filter.field}
                              onChange={(e) => updateFilterField(filter.id, e.target.value)}
                              className="flex-1 h-7 px-2 text-xs border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#f26318] focus:border-[#f26318] appearance-none cursor-pointer"
                            >
                              <option value="">Select field...</option>
                              {allFilterFields.map((fKey) => (
                                <option key={fKey} value={fKey}>
                                  {filterFieldLabels[fKey]}
                                </option>
                              ))}
                            </select>

                            {/* Operator selector */}
                            {filter.field && operators.length > 0 && (
                              <select
                                value={filter.operator}
                                onChange={(e) =>
                                  updateFilterOperator(filter.id, e.target.value)
                                }
                                className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#f26318] focus:border-[#f26318] appearance-none cursor-pointer"
                              >
                                {operators.map((op) => (
                                  <option key={op} value={op}>
                                    {op}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Row 2: Values */}
                          {filter.field && (
                            <FilterValueSelector
                              filter={filter}
                              options={options}
                              inputType={inputType}
                              onChange={(values) =>
                                updateFilterValues(filter.id, values)
                              }
                            />
                          )}

                          {/* Selected value chips for dropdown fields */}
                          {filter.field && inputType === "dropdown" && filter.values.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {filter.values.map((val) => (
                                <span
                                  key={val}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700"
                                >
                                  {val}
                                  <button
                                    onClick={() =>
                                      updateFilterValues(
                                        filter.id,
                                        filter.values.filter((v) => v !== val)
                                      )
                                    }
                                    className="text-orange-400 hover:text-orange-600"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Remove filter */}
                        <button
                          onClick={() => removeFilter(filter.id)}
                          className="mt-1 text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mx-4" />

          {/* Columns Section */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Columns
              </label>
              <button
                onClick={() => {
                  setShowColumnPicker(!showColumnPicker);
                  setColumnSearchQuery("");
                }}
                className="flex items-center gap-1 text-xs text-[#f26318] hover:text-[#d94f0e] font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                {showColumnPicker ? "Done" : "Add columns"}
              </button>
            </div>

            {/* Column Picker Panel */}
            {showColumnPicker && (
              <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search columns..."
                      value={columnSearchQuery}
                      onChange={(e) => setColumnSearchQuery(e.target.value)}
                      className="w-full h-7 pl-7 pr-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#f26318] focus:border-[#f26318]"
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto border-t border-gray-200">
                  {Object.entries(categorizedAvailable).map(([category, cols]) => (
                    <div key={category}>
                      <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-100/50">
                        {category}
                      </div>
                      {cols.map((col) => {
                        const isSelected = columns.includes(col.id);
                        return (
                          <button
                            key={col.id}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-white transition-colors text-left"
                            onClick={() => toggleColumn(col.id)}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-[#f26318] border-[#f26318]"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
                            <span className="text-xs text-gray-700">
                              {col.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current columns - draggable */}
            {columns.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-400">No columns selected</p>
              </div>
            ) : (
              <div className="space-y-1">
                {columns.map((colId, index) => {
                  const col = allColumns.find((c) => c.id === colId);
                  return (
                    <DraggableColumnRow
                      key={colId}
                      columnId={colId}
                      label={col?.label || colId}
                      index={index}
                      moveColumn={moveColumn}
                      onRemove={() => removeColumn(colId)}
                    />
                  );
                })}
                <p className="text-xs text-gray-400 mt-2 px-1">
                  {columns.length} column{columns.length !== 1 ? "s" : ""} &middot; Drag to reorder
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mx-4" />

          {/* Sort Order Section */}
          <div className="px-4 py-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
              Sort Order
            </label>
            <div className="flex items-center gap-2">
              <select
                value={sortColumn}
                onChange={(e) => onSortColumnChange(e.target.value)}
                className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#f26318] focus:border-transparent"
              >
                {allColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")
                }
                className="h-9 px-3 flex items-center gap-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
              >
                {sortDirection === "asc" ? (
                  <>
                    <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600">Asc</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600">Desc</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
          <Button
            variant="ghost"
            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#f26318] hover:bg-[#d94f0e] text-white"
            onClick={onSave}
            disabled={!viewName.trim()}
          >
            {isEditing ? "Save Changes" : "Create View"}
          </Button>
        </div>
      </div>
    </>
  );
}