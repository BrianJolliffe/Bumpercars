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
  id: "ID",
  name: "Name",
  status: "Status",
  destination: "Ad Type",
  objective: "Objective",
  mediaChannel: "Media Channel",
  platform: "Platform",
  startDate: "Start Date",
  endDate: "End Date",
  mediaPlan: "Media Plan",
  brandId: "Brand ID",
  lastModified: "Last Modified",
  pacing: "Pacing",
  budget: "Budget",
  spend: "Spend",
  budgetSpent: "% Budget Spent",
  remainingBudget: "Remaining Budget",
  flightCompleted: "% Flight Completed",
  budgetAtRisk: "Budget at Risk",
  totalSales: "Total Sales",
  onlineSales: "Online Sales",
  offlineSales: "Offline Sales",
  roasTotal: "Total ROAS",
  roasOnline: "Online ROAS",
  roasOffline: "Offline ROAS",
  clicks: "Clicks",
  impressions: "Impressions",
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  conversionRate: "Conversion Rate",
};

// Define operators for each field type
const fieldOperators: Record<string, string[]> = {
  id: ["equals", "contains", "does not contain"],
  name: ["equals", "contains", "does not contain"],
  status: ["equals", "contains", "does not contain"],
  destination: ["equals", "contains", "does not contain"],
  objective: ["equals", "contains", "does not contain"],
  mediaChannel: ["equals", "contains", "does not contain"],
  platform: ["equals", "contains", "does not contain"],
  startDate: ["is on", "is on or before", "is on or after"],
  endDate: ["is on", "is on or before", "is on or after"],
  mediaPlan: ["equals", "contains", "does not contain"],
  brandId: ["is any of", "is none of"],
  lastModified: ["is on", "is on or before", "is on or after"],
  pacing: ["is greater than", "is less than", "is between"],
  budget: ["is greater than", "is less than", "is between"],
  spend: ["is greater than", "is less than", "is between"],
  budgetSpent: ["is greater than", "is less than", "is between"],
  remainingBudget: ["is greater than", "is less than", "is between"],
  flightCompleted: ["is greater than", "is less than", "is between"],
  budgetAtRisk: ["is greater than", "is less than", "is between"],
  totalSales: ["is greater than", "is less than", "is between"],
  onlineSales: ["is greater than", "is less than", "is between"],
  offlineSales: ["is greater than", "is less than", "is between"],
  roasTotal: ["is greater than", "is less than", "is between"],
  roasOnline: ["is greater than", "is less than", "is between"],
  roasOffline: ["is greater than", "is less than", "is between"],
  clicks: ["is greater than", "is less than", "is between"],
  impressions: ["is greater than", "is less than", "is between"],
  ctr: ["is greater than", "is less than", "is between"],
  cpc: ["is greater than", "is less than", "is between"],
  cpm: ["is greater than", "is less than", "is between"],
  conversionRate: ["is greater than", "is less than", "is between"],
};

// Define the input type for field 3
type InputType = "text" | "dropdown" | "date" | "multi-text";

const fieldInputTypes: Record<string, InputType> = {
  id: "text",
  name: "text",
  status: "dropdown",
  destination: "dropdown",
  objective: "dropdown",
  mediaChannel: "dropdown",
  platform: "dropdown",
  startDate: "date",
  endDate: "date",
  mediaPlan: "text",
  brandId: "multi-text",
  lastModified: "date",
  pacing: "dropdown",
  budget: "text",
  spend: "text",
  budgetSpent: "text",
  remainingBudget: "text",
  flightCompleted: "text",
  budgetAtRisk: "text",
  totalSales: "text",
  onlineSales: "text",
  offlineSales: "text",
  roasTotal: "text",
  roasOnline: "text",
  roasOffline: "text",
  clicks: "text",
  impressions: "text",
  ctr: "text",
  cpc: "text",
  cpm: "text",
  conversionRate: "text",
};

const filterOptions: Record<string, string[]> = {
  status: [
    "Running", "Draft", "Scheduled", "Ended", "On Hold", "Rejected", "Paused",
    "Paused by a user", "Paused by system",
    "Awaiting Verification", "Awaiting Verification by Retailer",
    "Awaiting Verification by Vantage", "Awaiting Verification by Ad Platforms",
    "Awaiting Retailer Approval", "Awaiting Brand Approval",
    "Awaiting Audience", "Awaiting Tracking Setup", "Awaiting External Approval",
  ],
  destination: ["Product Listing Ads", "Auction Banner", "Google Search", "Google PMAX", "Pinterest Shopping", "Pinterest Static Pins", "Meta"],
  objective: ["Awareness", "Consideration", "Conversion"],
  mediaChannel: ["Onsite", "Offsite"],
  platform: ["Meta", "Google Search", "Google PMAX", "Pinterest"],
  pacing: ["Under-pacing (<80%)", "On track (80% - 100%)", "Over-pacing (>100%)"],
};

function MultiTextInput({
  filterId,
  values,
  disabled,
  onAdd,
  onRemove,
}: {
  filterId: string;
  values: string[];
  disabled: boolean;
  onAdd: (id: string, raw: string) => void;
  onRemove: (id: string, value: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        onAdd(filterId, inputValue);
        setInputValue("");
      }
    }
    if (e.key === "Backspace" && inputValue === "" && values.length > 0) {
      onRemove(filterId, values[values.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    onAdd(filterId, pasted);
    setInputValue("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[180px] justify-between text-left"
          disabled={disabled}
        >
          <span className={values.length === 0 ? "text-gray-400" : "text-gray-900 truncate"}>
            {values.length === 0
              ? "Enter IDs..."
              : `${values.length} selected`}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type or paste IDs..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="flex-1 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 text-xs px-2"
              onClick={() => {
                if (inputValue.trim()) {
                  onAdd(filterId, inputValue);
                  setInputValue("");
                }
              }}
            >
              Add
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Separate with commas, newlines, or semicolons
          </p>
          {values.length > 0 && (
            <ScrollArea className="max-h-[200px]">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {values.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-medium text-orange-800"
                  >
                    {v}
                    <button
                      onClick={() => onRemove(filterId, v)}
                      className="text-orange-400 hover:text-orange-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </ScrollArea>
          )}
          {values.length > 1 && (
            <button
              onClick={() => {
                values.forEach(v => onRemove(filterId, v));
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilterCustomizer({ open, onOpenChange, onApplyFilters, currentFilters }: FilterCustomizerProps) {
  const [filters, setFilters] = useState<FilterRule[]>([
    {
      id: "filter-1",
      field: "",
      operator: "equals",
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
            operator: "equals",
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
      operator: "equals",
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

  const addMultiTextValues = (id: string, raw: string) => {
    const parsed = raw
      .split(/[,\n\r;]+/)
      .map(v => v.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;
    setFilters(filters.map(f => {
      if (f.id !== id) return f;
      const merged = [...new Set([...f.values, ...parsed])];
      return { ...f, values: merged };
    }));
  };

  const removeMultiTextValue = (id: string, value: string) => {
    setFilters(filters.map(f => {
      if (f.id !== id) return f;
      return { ...f, values: f.values.filter(v => v !== value) };
    }));
  };

  const handleApply = () => {
    // Keep all filter rows with a field selected (including preloaded ones with empty values)
    const filtersWithFields = filters.filter(f => f.field);
    if (onApplyFilters) {
      onApplyFilters(filtersWithFields);
    }
    onOpenChange(false);
  };

  const updateBetweenValue = (id: string, index: 0 | 1, value: string) => {
    setFilters(filters.map(f => {
      if (f.id !== id) return f;
      const newValues = [...f.values];
      newValues[index] = value;
      return { ...f, values: newValues };
    }));
  };

  const handleCancel = () => {
    // Reset to initial state
    setFilters([{
      id: "filter-1",
      field: "",
      operator: "equals",
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
                      {/* Campaign Setup Section */}
                      <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Campaign Setup
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "id")}>
                        ID
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "name")}>
                        Name
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "status")}>
                        Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "destination")}>
                        Ad Type
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "objective")}>
                        Objective
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "mediaChannel")}>
                        Media Channel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "platform")}>
                        Platform
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
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "brandId")}>
                        Brand ID
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "lastModified")}>
                        Last Modified
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Within Budget &amp; Pacing
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "pacing")}>
                        Pacing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "budget")}>
                        Budget
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "spend")}>
                        Spend
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "budgetSpent")}>
                        % Budget Spent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "remainingBudget")}>
                        Remaining Budget
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "flightCompleted")}>
                        % Flight Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "budgetAtRisk")}>
                        Budget at Risk
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Performance
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "totalSales")}>
                        Total Sales
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "onlineSales")}>
                        Online Sales
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "offlineSales")}>
                        Offline Sales
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "roasTotal")}>
                        Total ROAS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "roasOnline")}>
                        Online ROAS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "roasOffline")}>
                        Offline ROAS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "clicks")}>
                        Clicks
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "impressions")}>
                        Impressions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "ctr")}>
                        CTR
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "cpc")}>
                        CPC
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "cpm")}>
                        CPM
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateFilterField(filter.id, "conversionRate")}>
                        Conversion Rate
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
                  {inputType === "multi-text" ? (
                    <MultiTextInput
                      filterId={filter.id}
                      values={filter.values}
                      disabled={!filter.field}
                      onAdd={addMultiTextValues}
                      onRemove={removeMultiTextValue}
                    />
                  ) : inputType === "text" && filter.operator === "is between" ? (
                    <div className="flex items-center gap-1.5 w-[180px]">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Min"
                        value={filter.values[0] || ""}
                        onChange={(e) => updateBetweenValue(filter.id, 0, e.target.value)}
                        disabled={!filter.field}
                        className="w-[82px]"
                      />
                      <span className="text-xs text-gray-400">–</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Max"
                        value={filter.values[1] || ""}
                        onChange={(e) => updateBetweenValue(filter.id, 1, e.target.value)}
                        disabled={!filter.field}
                        className="w-[82px]"
                      />
                    </div>
                  ) : inputType === "text" ? (
                    <Input
                      type="text"
                      inputMode={filter.field === "budget" ? "decimal" : undefined}
                      placeholder={
                        filter.field === "budget"
                          ? "Amount (e.g. 50000)"
                          : "-"
                      }
                      value={filter.values[0] || ""}
                      onChange={(e) => updateTextValue(filter.id, e.target.value)}
                      disabled={!filter.field}
                      className="w-[180px]"
                    />
                  ) : inputType === "date" ? (
                    <div className="relative w-[180px]">
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
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-[180px] justify-between text-left"
                          disabled={!filter.field}
                        >
                          <span className={filter.values.length === 0 ? "text-gray-400" : "text-gray-900 truncate"}>
                            {filter.values.length === 0 
                              ? "-"
                              : filter.values.join(", ")
                            }
                          </span>
                          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
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
                  )}

                  {/* Remove filter row button */}
                  {filters.length > 1 ? (
                    <button
                      onClick={() => removeFilterRow(filter.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Remove filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-4 flex-shrink-0" />
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