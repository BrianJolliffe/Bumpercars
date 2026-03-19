import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface DateRangePickerProps {
  value: string;
  onChange: (value: string) => void;
}

type DateRangeOption = {
  label: string;
  value: string;
};

const recentlyUsedOptions: DateRangeOption[] = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "last-7-days" },
  { label: "Last 30 Days", value: "last-30-days" },
  { label: "Last Week", value: "last-week" },
  { label: "Last 4 Weeks", value: "last-4-weeks" },
  { label: "Last 13 Weeks", value: "last-13-weeks" },
  { label: "Last Month", value: "last-month" },
  { label: "Last 3 Months", value: "last-3-months" },
  { label: "Last 12 Months", value: "last-12-months" },
  { label: "Fiscal Year to Date (YTD)", value: "fiscal-ytd" },
  { label: "Custom Date Range", value: "custom-range" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  // Initialize with Last 7 days
  const today = new Date(2026, 1, 2); // Feb 2, 2026
  const last7DaysStart = new Date(today);
  last7DaysStart.setDate(last7DaysStart.getDate() - 6);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("last-7-days");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [leftMonth, setLeftMonth] = useState(last7DaysStart.getMonth());
  const [leftYear, setLeftYear] = useState(last7DaysStart.getFullYear());
  const [rightMonth, setRightMonth] = useState(today.getMonth());
  const [rightYear, setRightYear] = useState(today.getFullYear());
  // Store full start/end dates independently from calendar display
  const [rangeStart, setRangeStart] = useState<Date | null>(new Date(last7DaysStart));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(new Date(today));
  const [selectionPhase, setSelectionPhase] = useState<"start" | "end">("start");
  const [compareMode, setCompareMode] = useState<string>("year-over-year");
  const quickSelectRef = useRef<HTMLDivElement>(null);
  const customRangeRef = useRef<HTMLLabelElement>(null);

  // Auto-scroll to Custom Date Range when selected via calendar click
  useEffect(() => {
    if (selectedOption === "custom-range" && customRangeRef.current && quickSelectRef.current) {
      customRangeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedOption]);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const fullMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleQuickSelectChange = (optionValue: string) => {
    setSelectedOption(optionValue);
    
    const today = new Date(2026, 1, 2); // Feb 2, 2026 (current date in the app)
    let start = new Date();
    let end = new Date(today);

    switch (optionValue) {
      case "custom-range": {
        // Clear all selections; show current month + next month
        const todayRef = new Date(2026, 1, 2);
        setRangeStart(null);
        setRangeEnd(null);
        setSelectionPhase("start");
        setLeftMonth(todayRef.getMonth());
        setLeftYear(todayRef.getFullYear());
        if (todayRef.getMonth() === 11) {
          setRightMonth(0);
          setRightYear(todayRef.getFullYear() + 1);
        } else {
          setRightMonth(todayRef.getMonth() + 1);
          setRightYear(todayRef.getFullYear());
        }
        return; // Skip the rest of the function
      }
      case "today":
        start = new Date(today);
        break;
      case "last-7-days":
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;
      case "last-30-days":
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;
      case "last-week":
        // Start on Sunday of last week
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay() - 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        break;
      case "last-4-weeks":
        // Start on Sunday of 4 weeks ago
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay() - 28);
        end = new Date(start);
        end.setDate(end.getDate() + 27);
        break;
      case "last-13-weeks":
        // Start on Sunday of 13 weeks ago
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay() - 91);
        end = new Date(start);
        end.setDate(end.getDate() + 90);
        break;
      case "last-month":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "last-3-months":
        start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "last-12-months":
        start = new Date(today.getFullYear(), today.getMonth() - 12, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "fiscal-ytd":
        // Assuming fiscal year starts on April 1
        const fiscalYearStart = new Date(today.getFullYear(), 3, 1);
        if (today < fiscalYearStart) {
          fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
        }
        start = fiscalYearStart;
        end = new Date(today);
        break;
      default:
        start = new Date(today);
        start.setDate(start.getDate() - 29); // Last 30 days
        break;
    }

    // Update the calendar state
    setRangeStart(start);
    setRangeEnd(end);
    setLeftMonth(start.getMonth());
    setLeftYear(start.getFullYear());
    // Ensure right calendar always shows the month AFTER the left calendar
    // so the two calendars are always consecutive
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      // Same month — right calendar shows next month
      if (start.getMonth() === 11) {
        setRightMonth(0);
        setRightYear(start.getFullYear() + 1);
      } else {
        setRightMonth(start.getMonth() + 1);
        setRightYear(start.getFullYear());
      }
    } else {
      setRightMonth(end.getMonth());
      setRightYear(end.getFullYear());
    }
  };

  const formatDateRange = () => {
    if (!rangeStart || !rangeEnd) {
      return "Select a date range";
    }
    // Get the label for the selected option
    const optionLabel = recentlyUsedOptions.find(opt => opt.value === selectedOption)?.label || "Custom range";
    
    // Format dates
    const startStr = `${monthNames[rangeStart.getMonth()]} ${rangeStart.getDate()}, ${rangeStart.getFullYear()}`;
    const endStr = `${monthNames[rangeEnd.getMonth()]} ${rangeEnd.getDate()}, ${rangeEnd.getFullYear()}`;
    
    return `${optionLabel}: ${startStr} – ${endStr}`;
  };

  const renderCalendar = (month: number, year: number, isLeft: boolean) => {
    const days = daysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
    }

    // Days of the month
    for (let day = 1; day <= days; day++) {
      const currentDateObj = new Date(year, month, day);
      
      // Check if current date is within the range (only when both dates are set)
      const isInRange = rangeStart && rangeEnd && currentDateObj >= rangeStart && currentDateObj <= rangeEnd;
      const isStartDate = rangeStart ? currentDateObj.getTime() === rangeStart.getTime() : false;
      const isEndDate = rangeEnd ? currentDateObj.getTime() === rangeEnd.getTime() : false;

      calendarDays.push(
        <button
          key={day}
          className={`w-10 h-10 text-sm rounded-md flex items-center justify-center hover:bg-gray-100 transition-colors
            ${isStartDate || isEndDate ? "bg-orange-500 text-white hover:bg-orange-600 font-medium" : ""}
            ${isInRange && !isStartDate && !isEndDate ? "bg-orange-100 text-orange-900" : "text-gray-900"}
          `}
          onClick={() => {
            setSelectedOption("custom-range");
            const clickedDate = new Date(year, month, day);
            
            if (selectionPhase === "start" || !rangeStart) {
              // First click: set start date, keep end same temporarily
              setRangeStart(clickedDate);
              setRangeEnd(clickedDate);
              setSelectionPhase("end");
            } else {
              // Second click: set end date
              if (clickedDate >= rangeStart) {
                setRangeEnd(clickedDate);
              } else {
                // Clicked date is before start, so swap
                setRangeEnd(new Date(rangeStart));
                setRangeStart(clickedDate);
              }
              setSelectionPhase("start");
            }
          }}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="flex flex-col">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between mb-4">
          {isLeft && (
            <button 
              className="p-1 hover:bg-gray-100 rounded"
              onClick={() => {
                if (leftMonth === 0) {
                  setLeftMonth(11);
                  setLeftYear(leftYear - 1);
                  // Keep right calendar one month ahead
                  setRightMonth(0);
                  setRightYear(leftYear);
                } else {
                  setLeftMonth(leftMonth - 1);
                  // Keep right calendar one month ahead
                  setRightMonth(leftMonth);
                  setRightYear(leftYear);
                }
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <select 
              value={month}
              onChange={(e) => {
                const newMonth = Number(e.target.value);
                if (isLeft) {
                  setLeftMonth(newMonth);
                  // Keep right calendar one month ahead
                  if (newMonth === 11) {
                    setRightMonth(0);
                    setRightYear(leftYear + 1);
                  } else {
                    setRightMonth(newMonth + 1);
                    setRightYear(leftYear);
                  }
                } else {
                  setRightMonth(newMonth);
                  // Keep left calendar one month behind
                  if (newMonth === 0) {
                    setLeftMonth(11);
                    setLeftYear(rightYear - 1);
                  } else {
                    setLeftMonth(newMonth - 1);
                    setLeftYear(rightYear);
                  }
                }
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {fullMonthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select 
              value={year}
              onChange={(e) => {
                const newYear = Number(e.target.value);
                if (isLeft) {
                  setLeftYear(newYear);
                  // Keep right calendar one month ahead
                  if (leftMonth === 11) {
                    setRightMonth(0);
                    setRightYear(newYear + 1);
                  } else {
                    setRightMonth(leftMonth + 1);
                    setRightYear(newYear);
                  }
                } else {
                  setRightYear(newYear);
                  // Keep left calendar one month behind
                  if (rightMonth === 0) {
                    setLeftMonth(11);
                    setLeftYear(newYear - 1);
                  } else {
                    setLeftMonth(rightMonth - 1);
                    setLeftYear(newYear);
                  }
                }
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
          {!isLeft && (
            <button 
              className="p-1 hover:bg-gray-100 rounded"
              onClick={() => {
                if (rightMonth === 11) {
                  setRightMonth(0);
                  setRightYear(rightYear + 1);
                  // Keep left calendar one month behind
                  setLeftMonth(11);
                  setLeftYear(rightYear);
                } else {
                  setRightMonth(rightMonth + 1);
                  // Keep left calendar one month behind
                  setLeftMonth(rightMonth);
                  setLeftYear(rightYear);
                }
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="w-10 h-8 text-xs text-gray-500 flex items-center justify-center font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays}
        </div>
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <div className="flex items-center gap-2 px-4 h-9 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white cursor-pointer">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {formatDateRange()}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-600 ml-1" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-56 border-r border-gray-200 flex flex-col h-[420px]">
            <div className="p-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-900">Quick Select</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4" ref={quickSelectRef}>
              <div className="space-y-1">
                {recentlyUsedOptions.map((option) => (
                  <label
                    key={option.value}
                    ref={option.value === "custom-range" ? customRangeRef : undefined}
                    className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="date-range"
                      value={option.value}
                      checked={selectedOption === option.value}
                      onChange={() => handleQuickSelectChange(option.value)}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="p-6 h-[420px] flex flex-col">
            <div className="flex gap-8 flex-1">
              {renderCalendar(leftMonth, leftYear, true)}
              {renderCalendar(rightMonth, rightYear, false)}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Compare:</span>
                  <Select value={compareMode} onValueChange={setCompareMode}>
                    <SelectTrigger className="w-[180px] h-8 text-sm border-orange-400 focus:ring-orange-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year-over-year">Year over Year</SelectItem>
                      <SelectItem value="period-over-period">Period over Period</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  {selectedOption === "custom-range" && !rangeStart && !rangeEnd ? (
                    <span className="text-sm text-gray-500">Click a start date on the calendar</span>
                  ) : selectedOption === "custom-range" && selectionPhase === "end" ? (
                    <span className="text-sm text-gray-500">Now click an end date</span>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!rangeStart || !rangeEnd || selectionPhase === "end"}
                    onClick={() => {
                      onChange(formatDateRange());
                      setIsOpen(false);
                    }}
                  >
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}