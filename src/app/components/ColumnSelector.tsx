import { useState } from "react";
import { Columns3, ChevronDown, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";

interface ColumnSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onCustomizeColumns?: () => void;
  customPresets?: Record<string, string[]>;
  onApplyCustomPreset?: (presetName: string, columns: string[]) => void;
}

export function ColumnSelector({ value, onChange, onCustomizeColumns, customPresets = {}, onApplyCustomPreset }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("performance");
  const [quickPresetsExpanded, setQuickPresetsExpanded] = useState(true);
  const [myPresetsExpanded, setMyPresetsExpanded] = useState(true);

  const presets = [
    { id: "performance", label: "Performance" },
    { id: "engagement", label: "Engagement" },
    { id: "sales", label: "Sales" },
  ];

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    onChange(`Columns: ${presets.find(p => p.id === presetId)?.label}`);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 h-9 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white">
          <Columns3 className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            Columns: {presets.find(p => p.id === selectedPreset)?.label}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-600 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="py-2">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-200">
            <h3 className="font-semibold text-sm text-gray-900">Columns</h3>
          </div>

          {/* Quick Presets Section */}
          <div className="py-1">
            <button
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
              onClick={() => setQuickPresetsExpanded(!quickPresetsExpanded)}
            >
              {quickPresetsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-medium">Quick Presets</span>
            </button>
            {quickPresetsExpanded && (
              <div className="py-1">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    className="w-full text-left px-11 py-1.5 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3"
                    onClick={() => handlePresetChange(preset.id)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPreset === preset.id
                        ? "border-orange-500"
                        : "border-gray-300"
                    }`}>
                      {selectedPreset === preset.id && (
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      )}
                    </div>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* My Presets Section */}
          <div className="py-1">
            <button
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
              onClick={() => setMyPresetsExpanded(!myPresetsExpanded)}
            >
              {myPresetsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-medium">My Presets</span>
            </button>
            {myPresetsExpanded && (
              <>
                {Object.keys(customPresets).length > 0 ? (
                  <div className="py-1">
                    {Object.keys(customPresets).map((presetName) => (
                      <button
                        key={presetName}
                        className="w-full text-left px-11 py-1.5 hover:bg-gray-50 text-sm text-gray-700"
                        onClick={() => {
                          // Apply custom preset
                          setIsOpen(false);
                          if (onApplyCustomPreset) {
                            onApplyCustomPreset(presetName, customPresets[presetName]);
                          }
                        }}
                      >
                        {presetName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-11 py-2 text-xs text-gray-400">
                    No custom presets yet
                  </div>
                )}
              </>
            )}
          </div>

          {/* Customize Columns Button */}
          <div className="border-t border-gray-200 p-2">
            <Button
              variant="outline"
              className="w-full justify-center gap-2 text-sm font-medium text-orange-500 border-orange-500 hover:bg-orange-50"
              onClick={() => {
                setIsOpen(false);
                // Handle customize columns action
                if (onCustomizeColumns) {
                  onCustomizeColumns();
                }
              }}
            >
              <Columns3 className="w-4 h-4" />
              Customize Columns
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}