import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, X, Calendar } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/app/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ScrollArea } from "@/app/components/ui/scroll-area";

export interface FilterRule {
  id: string;
  field: string;
  operator: string;
  values: string[];
}

interface FilterCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters?: (filters: FilterRule[]) => void;
  currentFilters?: FilterRule[];
}

const filterFieldLabels: Record<string, string> = {
  name: "Name",
  id: "ID",
  status: "Status",
  objective: "Objective",
  adTypes: "Ad Types",
  mediaChannel: "Media Channel",
  targeting: "Targeting",
  startDate: "Start Date",
  endDate: "End Date",
  mediaPlan: "Media Plan",
  audience: "Audience",
  budgetSpent: "Budget Spent",
  flightCompleted: "% Flight Completed",
  productGroup: "Product Group",
  recentlyLaunched: "Recently Launched",
  recentlyChanged: "Recently Changed",
  pacing: "Pacing",
  impressions: "Impressions",
  ctc: "CTC",
  cpr: "CPR",
  roas: "ROAS",
  cpm: "CPM",
};

// Define operators for each field type
const fieldOperators: Record<string, string[]> = {
  name: ["is", "is not"],
  id: ["is", "is not"],
  status: ["is", "is not"],
  objective: ["is", "is not"],
  adTypes: ["is", "is not"],
  mediaChannel: ["is", "is not"],
  targeting: ["contains", "does not contain"],
  startDate: ["is on", "is on or before", "is on or after"],
  endDate: ["is on", "is on or before", "is on or after"],
  mediaPlan: ["is", "is not"],
};

// Define the input type for field 3
type InputType = "text" | "dropdown" | "date";

const fieldInputTypes: Record<string, InputType> = {
  name: "text",
  id: "text",
  status: "dropdown",
  objective: "dropdown",
  adTypes: "dropdown",
  mediaChannel: "dropdown",
  targeting: "dropdown",
  startDate: "date",
  endDate: "date",
  mediaPlan: "text",
  audience: "dropdown",
  productGroup: "dropdown",
  pacing: "dropdown",
};

const filterOptions: Record<string, string[]> = {
  status: ["Draft", "On Hold", "Running", "Rejected", "Ended"],
  objective: ["Awareness", "Consideration", "Conversion"],
  adTypes: ["In Grid", "Carousel", "Banner", "Premium Banner"],
  startDate: [],
  endDate: [],
  mediaPlan: [],
  mediaChannel: ["Onsite", "Offsite"],
  targeting: ["Geotargeting", "Keyword Targeting"],
  audience: ["Audience 1", "Audience 2", "Audience 3"],
  productGroup: ["Product Group A", "Product Group B", "Product Group C"],
  pacing: ["Under-pacing (<80%)", "On track (80% - 100%)", "Over-pacing (>100%)"],
};

export function FilterCustomizer({ open, onOpenChange, onApplyFilters, currentFilters }: FilterCustomizerProps) {
  const [filters, setFilters] = useState<FilterRule[]>([
    {
      id: "filter-1",
      field: "",
      operator: "Equal to",
      values: [],
    }
  ]);

  // Update filters when drawer opens with current filters
  useEffect(() => {
    if (open) {
      if (currentFilters && currentFilters.length > 0) {
        setFilters(currentFilters);
      } else {
        setFilters([
          {
            id: "filter-1",
            field: "",
            operator: "Equal to",
            values: [],
          }
        ]);
      }
    }
  }, [open, currentFilters]);

  const addFilterRow = () => {
    setFilters([...filters, {
      id: `filter-${Date.now()}`,
      field: "",
      operator: "Equal to",
      values: [],
    }]);
  };

  const removeFilterRow = (id: string) => {
    if (filters.length > 1) {
      setFilters(filters.filter(f => f.id !== id));
    }
  };

  const updateFilterField = (id: string, field: string) => {
    const defaultOperator = fieldOperators[field]?.[0] || "Equal to";
    setFilters(filters.map(f => 
      f.id === id ? { ...f, field, operator: defaultOperator, values: [] } : f
    ));
  };

  const updateFilterOperator = (id: string, operator: string) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, operator } : f
    ));
  };

  const toggleFilterValue = (id: string, value: string) => {
    setFilters(filters.map(f => {
      if (f.id === id) {
        const values = f.values.includes(value)
          ? f.values.filter(v => v !== value)
          : [...f.values, value];
        return { ...f, values };
      }
      return f;
    }));
  };

  const updateTextValue = (id: string, value: string) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, values: value ? [value] : [] } : f
    ));
  };

  const handleApply = () => {
    // Keep all filter rows with a field selected (including preloaded ones with empty values)
    const filtersWithFields = filters.filter(f => f.field);
    if (onApplyFilters) {
      onApplyFilters(filtersWithFields);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to initial state
    setFilters([{
      id: "filter-1",
      field: "",
      operator: "Equal to",
      values: [],
    }]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[540px] sm:w-[540px] md:w-[540px] lg:w-[540px] xl:w-[540px] max-w-none p-0 flex flex-col h-full">
        <SheetHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <SheetTitle>Edit Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Configure and customize filters for your campaigns
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {filters.map((filter, index) => {
              const fieldLabel = filter.field ? (filterFieldLabels[filter.field] || filter.field) : "Select filter";
              const availableOperators = filter.field ? (fieldOperators[filter.field] || []) : [];
              const inputType = filter.field ? (fieldInputTypes[filter.field] || "text") : "text";
              const availableValues = filter.field ? (filterOptions[filter.field] || []) : [];

              return (
                <div key={filter.id} className="flex items-center gap-3">
                  {/* Filter Field Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-[140px] justify-between"
                      >
                        <span className={!filter.field ? "text-gray-400" : "text-gray-900"}>
                          {fieldLabel}
                        </span>
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[220px] max-h-[300px] overflow-y-auto" align="start">
                      {/* Campaign Settings Section */}
                      <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Campaign Setup
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "name")}>
                        Name
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "id")}>
                        ID
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "status")}>
                        Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "objective")}>
                        Objective
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "adTypes")}>
                        Ad Types
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "mediaChannel")}>
                        Media Channel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "targeting")}>
                        Targeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "startDate")}>
                        Start Date
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "endDate")}>
                        End Date
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "mediaPlan")}>
                        Media Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "audience")}>
                        Audience
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "budgetSpent")}>
                        Budget Spent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "flightCompleted")}>
                        % Flight Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "productGroup")}>
                        Product Group
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "recentlyLaunched")}>
                        Recently Launched
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "recentlyChanged")}>
                        Recently Changed
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {/* Performance Section */}
                      <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Performance
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "pacing")}>
                        Pacing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "impressions")}>
                        Impressions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "ctc")}>
                        CTC
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "cpr")}>
                        CPR
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "roas")}>
                        ROAS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "cpm")}>
                        CPM
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Operator Dropdown */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-[140px] justify-between"
                        disabled={!filter.field}
                      >
                        <span className={!filter.operator || filter.operator === "-" ? "text-gray-400" : "text-gray-900"}>
                          {filter.operator || "-"}
                        </span>
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <div className="py-1">
                        {availableOperators.map((op) => (
                          <button
                            key={op}
                            onClick={() => updateFilterOperator(filter.id, op)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                              filter.operator === op ? "bg-orange-50" : ""
                            }`}
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Values Input/Dropdown - conditional based on inputType */}
                  {inputType === "text" ? (
                    <div className="relative w-[180px]">
                      <Input
                        type="text"
                        placeholder="-"
                        value={filter.values[0] || ""}
                        onChange={(e) => updateTextValue(filter.id, e.target.value)}
                        disabled={!filter.field}
                        className="w-full pr-8"
                      />
                      {filters.length > 1 && (
                        <button
                          onClick={() => removeFilterRow(filter.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : inputType === "date" ? (
                    <div className="relative w-[180px]">
                      <div className="relative">
                        <input
                          type="date"
                          value={filter.values[0] || ""}
                          onChange={(e) => updateTextValue(filter.id, e.target.value)}
                          disabled={!filter.field}
                          className="flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ colorScheme: 'light', color: filter.values[0] ? undefined : 'transparent' }}
                        />
                        {!filter.values[0] && (
                          <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                            <span className="text-sm text-gray-400">Select a date</span>
                          </div>
                        )}
                      </div>
                      {filters.length > 1 && (
                        <button
                          onClick={() => removeFilterRow(filter.id)}
                          className="absolute -right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-[180px] group/value">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between text-left"
                            disabled={!filter.field}
                          >
                            <span className={filter.values.length === 0 ? "text-gray-400" : "text-gray-900 truncate"}>
                              {filter.values.length === 0 
                                ? "-"
                                : filter.values.join(", ")
                              }
                            </span>
                            {filters.length > 1 ? (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); removeFilterRow(filter.id); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeFilterRow(filter.id); } }}
                                className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 opacity-0 group-hover/value:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </span>
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-0" align="start">
                          <div className="max-h-[300px] overflow-y-auto py-1">
                            {availableValues.length > 0 ? (
                              availableValues.map((value) => (
                                <div
                                  key={value}
                                  onClick={() => toggleFilterValue(filter.id, value)}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={filter.values.includes(value)}
                                    onCheckedChange={() => toggleFilterValue(filter.id, value)}
                                  />
                                  <span className="text-sm text-gray-900">{value}</span>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-400">
                                Select a filter first
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Filter Button */}
            <button
              onClick={addFilterRow}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Filter
            </button>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 w-full justify-end">
            <Button variant="outline" onClick={handleCancel} className="text-gray-600">
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-orange-600 hover:bg-orange-700 text-white">
              Apply
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}