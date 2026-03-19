import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

export function ExportSelector() {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'pdf') => {
    // Handle export functionality
    console.log(`Exporting as ${format}`);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white mb-1.5 h-10">
        <Download className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">Export</span>
        <ChevronDown className="w-4 h-4 text-gray-600 ml-1" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="py-2">
          <button
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-900"
            onClick={() => handleExport('csv')}
          >
            Export as CSV
          </button>
          <button
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-900"
            onClick={() => handleExport('pdf')}
          >
            Export as PDF
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}