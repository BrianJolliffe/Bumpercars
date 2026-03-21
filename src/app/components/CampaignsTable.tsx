import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MoreVertical, Star, X, ChevronLeft, ChevronRight, Info, MessageSquare, ArrowRight, Check, ArrowUpDown, ArrowDown, ArrowUp, Pencil, Copy, Store, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog"; // forwardRef-compatible
import { FilterCustomizer, FilterRule } from "@/app/components/FilterCustomizer";
import { toast } from "sonner";
// Notes drawer removed — notes are captured on action dialogs only
import { PacingPopover } from "@/app/components/PacingPopover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

export interface Campaign {
  id: string;
  name: string;
  category: string;
  status: "Draft" | "On Hold" | "Running" | "Rejected" | "Ended" | "Paused" | "Scheduled" | "Paused by a user" | "Paused by system" | "Awaiting Verification" | "Awaiting Verification by Retailer" | "Awaiting Verification by Vantage" | "Awaiting Verification by Ad Platforms" | "Awaiting Retailer Approval" | "Awaiting Brand Approval" | "Awaiting Audience" | "Awaiting Tracking Setup" | "Awaiting External Approval";
  destination: string;
  platform: "Meta" | "Google Search" | "Google PMAX" | "Pinterest";
  objective?: string;
  brandId?: string;
  adTypes?: string;
  mediaChannel?: string;
  startDate: string;
  endDate: string;
  budget: number;
  spend: number;
  pacing: string;
  ctr: string;
  roas: string;
  cpc?: string;
  cpm?: string;
  conversionRate?: string;
  sales?: string;
  /** Attributed sales — same as total when only one series exists */
  totalSales?: string;
  onlineSales?: string;
  offlineSales?: string;
  roasTotal?: string;
  roasOnline?: string;
  roasOffline?: string;
  impressions?: number;
  clicks?: number;
  optimizations: string | {
    type: 'single' | 'multiple' | 'complete';
    action?: string;
    count?: number;
    details?: Array<{ issue: string; recommendation: string }>;
  };
  pinned?: boolean;
  lastModified?: string;
  mediaPlan?: string;
  benchmarks?: {
    ctr?: { wow: number; yoy: number };
    roas?: { wow: number; yoy: number };
    sales?: { wow: number; yoy: number };
    pacing?: { wow: number; yoy: number };
    spend?: { wow: number; yoy: number };
  };
  pacingContext?: {
    dailyTrend: Array<{ day: string; shortDay: string; actual: number; expected: number }>;
    projectedEndSpend: number;
    headerNote: string;
    projectionNote: string;
  };
}

export interface PerformanceRule {
  id: string;
  metric: string;
  metricSearchQuery: string;
  operator: string;
  value1: string;
  value2: string;
  color: string;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStatuses: string[];
  setSelectedStatuses: (statuses: string[]) => void;
  statusOptions: string[];
  toggleStatus: (status: string) => void;
  onUpdateCampaign?: (id: string, updates: Partial<Campaign>) => void;
  onSaveCustomView?: (viewName: string) => void;
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  appliedFiltersFromApp?: FilterRule[];
  setAppliedFiltersInApp?: (filters: FilterRule[]) => void;
  onStarredChange?: (starredIds: Set<string>) => void;
  quickFilters?: {
    status: string[];
    objective: string[];
    adTypes: string[];
    mediaPlan: string[];
    platform: string[];
  };
  onRemoveQuickFilter?: (category: string, value: string) => void;
  onClearAllFilters?: () => void;
  onOpenAdvancedFilters?: () => void;
  onOpenQuickFilter?: (category: string) => void;
}

export function CampaignsTable({ 
  campaigns, 
  searchQuery, 
  setSearchQuery, 
  selectedStatuses, 
  setSelectedStatuses, 
  statusOptions, 
  toggleStatus, 
  onUpdateCampaign, 
  onSaveCustomView, 
  visibleColumns,
  setVisibleColumns,
  appliedFiltersFromApp,
  setAppliedFiltersInApp,
  onStarredChange,
  quickFilters,
  onRemoveQuickFilter,
  onClearAllFilters,
  onOpenAdvancedFilters,
  onOpenQuickFilter,
}: CampaignsTableProps) {
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  
  const [selectedAdTypes, setSelectedAdTypes] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedPacing, setSelectedPacing] = useState<string[]>([]);
  const [starredCampaigns, setStarredCampaigns] = useState<Set<string>>(new Set());
  const [isViewModified, setIsViewModified] = useState(false);
  const [showCustomViewDialog, setShowCustomViewDialog] = useState(false);
  const [customViewName, setCustomViewName] = useState("");
  const [campaignMenuOpen, setCampaignMenuOpen] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<{ campaignId: string; field: "endDate" | "budget" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editBudgetFrequency, setEditBudgetFrequency] = useState("Lifetime");
  const [editNote, setEditNote] = useState("");
  const [showEditNote, setShowEditNote] = useState(false);
  // Notes drawer removed — notes captured on action dialogs only
  const [currentPage, setCurrentPage] = useState(1);
  const campaignsPerPage = 10;
  /** UI-only page size; pagination still uses `campaignsPerPage` (demo). */
  const [rowsPerPageDisplay, setRowsPerPageDisplay] = useState("10");
  const [showFilterCustomizer, setShowFilterCustomizer] = useState(false);
  const [enabledFilters, setEnabledFilters] = useState<string[]>([]);
  const [appliedFiltersLocal, setAppliedFiltersLocal] = useState<Array<{
    id: string;
    field: string;
    operator: string;
    values: string[];
  }>>([]);
  // Use app-level filters if provided, otherwise use local state
  const appliedFilters = appliedFiltersFromApp || appliedFiltersLocal;
  const setAppliedFilters = setAppliedFiltersInApp || setAppliedFiltersLocal;
  const [pauseConfirmCampaign, setPauseConfirmCampaign] = useState<Campaign | null>(null);
  const [pauseNote, setPauseNote] = useState("");
  const [resumeConfirmCampaign, setResumeConfirmCampaign] = useState<Campaign | null>(null);
  const [resumeNote, setResumeNote] = useState("");
  // Sorting state — default sort is lastModified descending
  const [sortColumn, setSortColumn] = useState<string>("lastModified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Column sort-type mapping: determines first-click direction
  // "text" → first click ascending (A→Z); "numeric"/"date" → first click descending (high→low / newest→oldest)
  const columnSortType: Record<string, "text" | "numeric" | "date"> = {
    starred: "numeric",
    name: "text",
    id: "text",
    brandId: "text",
    status: "text",
    destination: "text",
    objective: "text",
    mediaChannel: "text",
    platform: "text",
    mediaPlan: "text",
    startDate: "date",
    endDate: "date",
    lastModified: "date",
    flightCompleted: "numeric",
    pacing: "numeric",
    budget: "numeric",
    spend: "numeric",
    budgetSpent: "numeric",
    remainingBudget: "numeric",
    ctr: "numeric",
    cpc: "numeric",
    cpm: "numeric",
    conversionRate: "numeric",
    sales: "numeric",
    roas: "numeric",
    totalSales: "numeric",
    onlineSales: "numeric",
    offlineSales: "numeric",
    roasTotal: "numeric",
    roasOnline: "numeric",
    roasOffline: "numeric",
    clicks: "numeric",
    impressions: "numeric",
    budgetAtRisk: "numeric",
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Already sorting by this column — toggle direction
      setSortDirection(prev => prev === "desc" ? "asc" : "desc");
    } else {
      // New column — set default direction based on column type
      const type = columnSortType[column] || "text";
      const defaultDir = type === "text" ? "asc" : "desc";
      setSortColumn(column);
      setSortDirection(defaultDir);
    }
  };

  // Helper to check if a column is the active sort column
  const isSortActive = (column: string) => sortColumn === column;

  // Sort icon component — active column gets a bold dark arrow; inactive gets muted up/down
  const SortIcon = ({ column, className = "w-3.5 h-3.5" }: { column: string; className?: string }) => {
    const isActive = sortColumn === column;
    if (isActive) {
      return sortDirection === "desc"
        ? <ArrowDown strokeWidth={2.5} className={`${className} text-gray-900 cursor-pointer transition-colors shrink-0`} onClick={(e) => { e.stopPropagation(); handleSort(column); }} />
        : <ArrowUp strokeWidth={2.5} className={`${className} text-gray-900 cursor-pointer transition-colors shrink-0`} onClick={(e) => { e.stopPropagation(); handleSort(column); }} />;
    }
    return <ArrowUpDown className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors shrink-0" onClick={(e) => { e.stopPropagation(); handleSort(column); }} />;
  };

  // Sticky scrollbar refs and sync
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [scrollContentWidth, setScrollContentWidth] = useState(0);
  const isSyncingScroll = useRef(false);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const updateWidth = () => setScrollContentWidth(el.scrollWidth);
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    // Also observe the table inside
    const table = el.querySelector('table');
    if (table) ro.observe(table);
    return () => ro.disconnect();
  }, [visibleColumns]);

  const handleTableScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (scrollbarRef.current && tableScrollRef.current) {
      scrollbarRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { isSyncingScroll.current = false; });
  }, []);

  const handleScrollbarScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (tableScrollRef.current && scrollbarRef.current) {
      tableScrollRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { isSyncingScroll.current = false; });
  }, []);

  // Handle horizontal wheel/trackpad on the table container since native h-scroll is hidden
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (deltaX !== 0) {
        e.preventDefault();
        el.scrollLeft += deltaX;
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const toggleEnabledFilter = (filterId: string) => {
    setEnabledFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

  // Dynamic table minWidth based on visible columns
  const columnWidthMap: Record<string, number> = {
    name: 200, id: 60, brandId: 80, status: 72, destination: 88,
    objective: 110, startDate: 78, endDate: 78, flightCompleted: 68,
    pacing: 100, budget: 78, spend: 78, budgetSpent: 68, remainingBudget: 82,
    ctr: 48, cpc: 52, cpm: 52, conversionRate: 78, sales: 78,
    roas: 52, totalSales: 78, onlineSales: 78, offlineSales: 82,
    roasTotal: 52, roasOnline: 52, roasOffline: 56,
    clicks: 64, impressions: 76, budgetAtRisk: 90, lastModified: 75, mediaPlan: 100,
  };
  const alwaysVisibleWidth = 64 + 28 + 160 + 40; // toggle + star + optimizations + actions
  const dynamicColumnsWidth = visibleColumns.reduce((sum, col) => sum + (columnWidthMap[col] || 100), 0);
  const tableMinWidth = alwaysVisibleWidth + dynamicColumnsWidth;

  // Pinned column widths for scrollbar positioning
  const leftPinnedWidth = 64 + 28 + (isColumnVisible("id") ? 60 : 0) + (isColumnVisible("name") ? 200 : 0);
  const rightPinnedWidth = 160 + 40; // optimizations + actions

  // Track if view has been modified from default
  useEffect(() => {
    const hasFilters = selectedStatuses.length > 1 || // More than just "Running"
                       selectedAdTypes.length > 0 ||
                       selectedPacing.length > 0 ||
                       selectedObjectives.length > 0 ||
                       selectedBrandIds.length > 0 ||
                       searchQuery !== "";
    setIsViewModified(hasFilters);
  }, [selectedStatuses, selectedAdTypes, selectedPacing, selectedObjectives, selectedBrandIds, searchQuery]);

  // Notify parent when starred set changes (use ref to avoid infinite loop from inline callbacks)
  const onStarredChangeRef = useRef(onStarredChange);
  onStarredChangeRef.current = onStarredChange;
  const starredMountedRef = useRef(false);
  useEffect(() => {
    if (!starredMountedRef.current) {
      starredMountedRef.current = true;
      return;
    }
    onStarredChangeRef.current?.(starredCampaigns);
  }, [starredCampaigns]);

  const toggleStar = (campaignId: string) => {
    setStarredCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  // Notes functions removed — notes are captured on action dialogs only

  // Parse helpers for sorting
  const parseDateStr = (str?: string): number => {
    if (!str) return 0;
    return new Date(str.replace(" at ", " ")).getTime() || 0;
  };

  const parseNumericStr = (str?: string): number => {
    if (!str) return 0;
    // Strip currency symbols, commas, %, x multipliers
    const cleaned = str.replace(/[$,%x]/g, "").replace(/,/g, "").trim();
    return parseFloat(cleaned) || 0;
  };

  // Snapshot starred set only when sorting by starred column, so toggling a star
  // while sorted by any other column doesn't re-order the list.
  const starredSnapshotForSort = useMemo(
    () => (sortColumn === "starred" ? new Set(starredCampaigns) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortColumn === "starred" ? starredCampaigns : sortColumn]
  );

  const displayCampaigns = useMemo(() => [...campaigns].sort((a, b) => {
    // Pin starred campaigns to top of the list (regardless of sort column)
    const aStarred = starredCampaigns.has(a.id) ? 1 : 0;
    const bStarred = starredCampaigns.has(b.id) ? 1 : 0;
    if (aStarred !== bStarred) return bStarred - aStarred; // starred first

    const type = columnSortType[sortColumn] || "text";
    const dir = sortDirection === "asc" ? 1 : -1;

    let aVal: any;
    let bVal: any;

    if (sortColumn === "starred" && starredSnapshotForSort) {
      // When explicitly sorting by starred, don't double-pin — just use normal sort
      return 0;
    } else if (type === "date") {
      if (sortColumn === "lastModified") {
        aVal = parseDateStr(a.lastModified);
        bVal = parseDateStr(b.lastModified);
      } else if (sortColumn === "startDate") {
        aVal = parseDateStr(a.startDate);
        bVal = parseDateStr(b.startDate);
      } else if (sortColumn === "endDate") {
        aVal = parseDateStr(a.endDate);
        bVal = parseDateStr(b.endDate);
      } else {
        aVal = 0; bVal = 0;
      }
      return (aVal - bVal) * dir;
    } else if (type === "numeric") {
      const getNumeric = (c: Campaign): number => {
        switch (sortColumn) {
          case "budget": return c.budget;
          case "spend": return c.spend;
          case "flightCompleted": {
            const start = parseDateStr(c.startDate);
            const end = parseDateStr(c.endDate);
            const now = Date.now();
            if (end <= start) return 0;
            return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
          }
          case "pacing": return parseNumericStr(c.pacing);
          case "budgetSpent": return c.budget > 0 ? (c.spend / c.budget) * 100 : 0;
          case "remainingBudget": return c.budget - c.spend;
          case "ctr": return parseNumericStr(c.ctr);
          case "cpc": return parseNumericStr(c.cpc);
          case "cpm": return parseNumericStr(c.cpm);
          case "conversionRate": return parseNumericStr(c.conversionRate);
          case "totalSales": return parseNumericStr(c.totalSales ?? c.sales);
          case "onlineSales": return parseNumericStr(c.onlineSales);
          case "offlineSales": return parseNumericStr(c.offlineSales);
          case "roasTotal": return parseNumericStr(c.roasTotal ?? c.roas);
          case "roasOnline": return parseNumericStr(c.roasOnline);
          case "roasOffline": return parseNumericStr(c.roasOffline);
          case "clicks": return c.clicks ?? 0;
          case "impressions": return c.impressions ?? 0;
          case "budgetAtRisk": {
            const pacingNum = parseFloat(c.pacing);
            if (isNaN(pacingNum) || c.status === "Draft" || c.status === "Ended") return 0;
            const start = parseDateStr(c.startDate);
            const end = parseDateStr(c.endDate);
            const now = Date.now();
            const fcPct = end <= start ? 0 : Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
            const flightPct = fcPct / 100;
            const projected = flightPct > 0 ? c.spend / flightPct : 0;
            return Math.max(0, projected - c.budget);
          }
          default: return 0;
        }
      };
      aVal = getNumeric(a);
      bVal = getNumeric(b);
      return (aVal - bVal) * dir;
    } else {
      // Text sort
      const getTextVal = (c: Campaign): string => {
        switch (sortColumn) {
          case "name": return c.name;
          case "id": return c.id;
          case "brandId": return c.brandId || "";
          case "status": return c.status;
          case "destination": return c.destination;
          case "objective": return c.objective || "";
          case "mediaPlan": return c.mediaPlan || "";
          default: return "";
        }
      };
      aVal = getTextVal(a);
      bVal = getTextVal(b);
      return aVal.localeCompare(bVal) * dir;
    }

    return (aVal - bVal) * dir;
  }), [campaigns, sortColumn, sortDirection, starredSnapshotForSort, starredCampaigns]);

  const adTypeOptions = ["In Grid", "Carousel", "Banner", "Premium Banner"];

  const pacingOptions = [
    "Under-pacing (<80%)",
    "On track (80% - 100%)",
    "Over-pacing (>100%)"
  ];

  const objectiveOptions = ["Awareness", "Consideration", "Conversion", "Sales"];
  
  const brandIdOptions = [
    "1234",
    "5678",
    "9012",
    "3456",
    "7890"
  ];

  const toggleAdType = (adType: string) => {
    setSelectedAdTypes(prev => 
      prev.includes(adType) 
        ? prev.filter(t => t !== adType)
        : [...prev, adType]
    );
  };



  const removeAdTypeFilter = (adType: string) => {
    setSelectedAdTypes(selectedAdTypes.filter(t => t !== adType));
  };

  const toggleObjective = (objective: string) => {
    setSelectedObjectives(prev => 
      prev.includes(objective) 
        ? prev.filter(o => o !== objective)
        : [...prev, objective]
    );
  };

  const toggleAllObjectives = () => {
    const allSelected = objectiveOptions.every(obj => selectedObjectives.includes(obj));
    if (allSelected) {
      setSelectedObjectives([]);
    } else {
      setSelectedObjectives([...objectiveOptions]);
    }
  };

  const toggleBrandId = (brandId: string) => {
    setSelectedBrandIds(prev => 
      prev.includes(brandId) 
        ? prev.filter(b => b !== brandId)
        : [...prev, brandId]
    );
  };

  const toggleAllBrandIds = () => {
    const allSelected = brandIdOptions.every(brand => selectedBrandIds.includes(brand));
    if (allSelected) {
      setSelectedBrandIds([]);
    } else {
      setSelectedBrandIds([...brandIdOptions]);
    }
  };

  const removeBrandIdFilter = (brandId: string) => {
    setSelectedBrandIds(selectedBrandIds.filter(b => b !== brandId));
  };

  const togglePacing = (pacing: string) => {
    setSelectedPacing(prev => 
      prev.includes(pacing) 
        ? prev.filter(p => p !== pacing)
        : [...prev, pacing]
    );
  };

  const removePacingFilter = (pacing: string) => {
    setSelectedPacing(selectedPacing.filter(p => p !== pacing));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Meta":
        return (
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 16 16" fill="#0866FF">
            <path d="M8.217 5.243C9.145 3.988 10.171 3 11.483 3 13.96 3 16 6.153 16.001 9.907c0 2.29-.986 3.725-2.757 3.725-1.543 0-2.395-.866-3.924-3.424l-.667-1.123-.118-.197a55 55 0 0 0-.53-.877l-1.178 2.08c-1.673 2.925-2.615 3.541-3.923 3.541C1.086 13.632 0 12.217 0 9.973 0 6.388 1.995 3 4.598 3c.318 0 .627.04.924.122.31.086.611.22.913.407.577.359 1.154.915 1.782 1.714M4.95 5.516c-.87.03-1.78.924-2.573 2.636-.429.924-.737 1.953-.737 2.964 0 .726.181 1.144.55 1.144.396 0 .96-.473 1.82-1.925l1.478-2.58c-.545-.752-1.04-1.26-1.538-1.239m6.062 5.63c.459.774.878 1.17 1.258 1.17.445 0 .706-.405.706-1.358 0-2.837-1.2-5.463-2.974-5.463-.556 0-1.097.474-1.726 1.293l1.562 2.632c.48.835.822 1.403 1.174 1.726"/>
          </svg>
        );
      case "Google Search":
      case "Google PMAX":
        return (
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        );
      case "Pinterest":
        return (
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 16 16" fill="#E60023">
            <path d="M8 0a8 8 0 0 0-2.915 15.452c-.07-.633-.134-1.606.027-2.297.146-.625.938-3.977.938-3.977s-.239-.479-.239-1.187c0-1.113.645-1.943 1.448-1.943.682 0 1.012.512 1.012 1.127 0 .686-.437 1.712-.663 2.663-.188.796.4 1.446 1.185 1.446 1.422 0 2.515-1.5 2.515-3.664 0-1.915-1.377-3.254-3.342-3.254-2.276 0-3.612 1.707-3.612 3.471 0 .688.265 1.425.595 1.826a.24.24 0 0 1 .056.23c-.061.252-.196.796-.222.907-.035.146-.116.177-.268.107-1-.465-1.624-1.926-1.624-3.1 0-2.523 1.834-4.84 5.286-4.84 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.811 0-1.573-.421-1.834-.919l-.498 1.902c-.181.695-.669 1.566-.995 2.097A8 8 0 1 0 8 0"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const TrendArrow = ({ value }: { value: number | undefined }) => {
    if (value === undefined) return null;
    if (value > 2) return (
      <svg className="w-3 h-3 text-green-500 shrink-0" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 2L10 8H2L6 2Z" />
      </svg>
    );
    if (value < -2) return (
      <svg className="w-3 h-3 text-red-500 shrink-0" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 10L2 4H10L6 10Z" />
      </svg>
    );
    return (
      <svg className="w-3 h-3 text-gray-400 shrink-0" viewBox="0 0 12 12" fill="none">
        <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
      </svg>
    );
  };

  const getPacingIndicator = (pacing: string, health: { status: string; color: string; label: string; issues: string[] }, campaign: Campaign) => {
    // Use health status for coloring
    let colorClass = "text-gray-900"; // default
    
    if (health.status === "healthy") {
      colorClass = "text-green-600";
    } else if (health.status === "warning") {
      colorClass = "text-yellow-600";
    } else if (health.status === "critical") {
      colorClass = "text-red-600";
    }

    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`text-sm font-normal ${colorClass}`}>{pacing}</span>
      </span>
    );
  };

  const removeStatusFilter = (status: string) => {
    setSelectedStatuses(selectedStatuses.filter(s => s !== status));
  };

  const removeObjectiveFilter = (objective: string) => {
    setSelectedObjectives(selectedObjectives.filter(o => o !== objective));
  };

  const removeAppliedFilter = (filterId: string) => {
    setAppliedFilters(appliedFilters.filter(f => f.id !== filterId));
  };

  const getFilterFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: "Name",
      id: "ID",
      status: "Status",
      objective: "Objective",
      adTypes: "Ad Types",
      mediaChannel: "Media Channel",
      delivery: "Delivery",
      audience: "Audience",
      productGroup: "Product Group",
      pacing: "Pacing",
      startDate: "Start Date",
      endDate: "End Date",
      lastModified: "Last Modified",
      mediaPlan: "Media Plan",
      flightCompleted: "% Flight Completed",
      budget: "Budget",
      spend: "Spend",
      budgetSpent: "% Budget Spent",
      remainingBudget: "Remaining Budget",
      impressions: "Impressions",
      ctc: "CTC",
      cpr: "CPR",
      roas: "ROAS",
      roasTotal: "Total ROAS",
      roasOnline: "Online ROAS",
      roasOffline: "Offline ROAS",
      totalSales: "Total Sales",
      onlineSales: "Online Sales",
      offlineSales: "Offline Sales",
      clicks: "Clicks",
      budgetAtRisk: "Budget at Risk",
      cpm: "CPM",
      ctr: "CTR",
    };
    return labels[field] || field;
  };

  const formatFilterValue = (field: string, value: string): string => {
    if (["startDate", "endDate", "lastModified"].includes(field) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value + "T00:00:00");
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }
    const n = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    if (!isNaN(n)) {
      if (["budget", "spend", "remainingBudget", "totalSales", "onlineSales", "offlineSales"].includes(field)) {
        return `$${n.toLocaleString()}`;
      }
      if (field === "budgetSpent" || field === "flightCompleted") {
        return `${n}%`;
      }
    }
    return value;
  };

  const calculateFlightCompletion = (startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // If campaign hasn't started yet
    if (today < start) {
      return 0;
    }
    
    // If campaign has ended
    if (today > end) {
      return 100;
    }
    
    // Calculate percentage
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    return (elapsedDuration / totalDuration) * 100;
  };

  // Pagination calculations
  const totalPages = Math.ceil(displayCampaigns.length / campaignsPerPage);
  const startIndex = (currentPage - 1) * campaignsPerPage;
  const endIndex = startIndex + campaignsPerPage;
  const paginatedCampaigns = displayCampaigns.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatuses, selectedAdTypes, selectedPacing, selectedObjectives, selectedBrandIds, searchQuery]);

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };



  // Get campaigns that share the same media plan
  const getRelatedCampaigns = (mediaPlan: string | undefined) => {
    if (!mediaPlan) return [];
    return campaigns.filter(c => c.mediaPlan === mediaPlan);
  };

  // Generate pacing trend data for sparkline with realistic volatility
  const generatePacingTrend = (currentPacing: string, campaignId: string) => {
    const current = parseFloat(currentPacing.replace(/[^0-9.-]/g, ''));
    // Use campaign ID as seed base
    const idNum = parseInt(campaignId.replace(/\D/g, '')) || 113602;
    
    // Simple pseudo-random function using the seed
    const getRandom = (index: number) => {
      const x = Math.sin(idNum + index * 123.45) * 10000;
      return x - Math.floor(x);
    };

    const days = 7;
    const values = new Array(days).fill(0);
    values[days - 1] = current;
    
    // Generate random walk backwards from current value
    for (let i = days - 2; i >= 0; i--) {
      // Add significant volatility (5-20% daily swings) to make it look realistic
      const volatility = 0.2; 
      const direction = getRandom(i) > 0.5 ? 1 : -1;
      
      // Calculate change
      const percentChange = getRandom(i + 100) * volatility;
      const absoluteChange = (values[i + 1] * percentChange) * direction;
      
      // Add some fixed noise
      const noise = (getRandom(i + 200) * 10) - 5;
      
      let prevValue = values[i + 1] + absoluteChange + noise;
      
      // Clamp values to reasonable bounds (0% to 200%)
      prevValue = Math.max(0, Math.min(200, prevValue));
      values[i] = prevValue;
    }
    
    // Format for Recharts
    return values.map((val, i) => ({ day: i, value: val }));
  };

  // Calculate campaign health based on multiple factors
  const calculateCampaignHealth = (campaign: Campaign) => {
    let healthScore = 100;
    let issues: string[] = [];

    // Check if paused
    if (campaign.status === "Paused") {
      healthScore -= 50;
      issues.push("Campaign is paused");
    }

    // Check pacing - only flag severe issues
    const pacingValue = parseFloat(campaign.pacing.replace(/[^0-9.-]/g, ''));
    
    // Analyze pacing trend
    const trendData = generatePacingTrend(campaign.pacing, campaign.id);
    const startAvg = (trendData[0].value + trendData[1].value + trendData[2].value) / 3;
    const endAvg = (trendData[trendData.length - 1].value + trendData[trendData.length - 2].value + trendData[trendData.length - 3].value) / 3;
    const trendDiff = endAvg - startAvg;
    
    const isIncreasing = trendDiff > 5;
    const isDeclining = trendDiff < -5;
    
    let trendContext = "Stable";
    let trendDirection: "increasing" | "declining" | "stable" = "stable";

    if (isIncreasing) trendDirection = "increasing";
    if (isDeclining) trendDirection = "declining";
    
    // Pacing Logic with Trend Context
    if (pacingValue < 80) {
      if (isIncreasing) {
        // Low but recovering
        healthScore -= 10; // Less penalty than stable low
        issues.push("Under-pacing but recovering");
        trendContext = "Recovering";
      } else {
        // Stable low or declining further
        healthScore -= 20;
        issues.push("Significantly under-pacing");
        trendContext = "Critically Low";
      }
    } else if (pacingValue > 110) {
      if (isDeclining) {
        // High but coming down
        healthScore -= 10;
        issues.push("Over-pacing but normalizing");
        trendContext = "Normalizing";
      } else {
        // Stable high or increasing
        healthScore -= 15;
        issues.push("Significantly over-pacing");
        trendContext = "Critically High";
      }
    } else {
      // Good pacing range (80-110)
      if (isDeclining && pacingValue < 90) {
        // Dropping within healthy range, might become issue
        healthScore -= 5;
        issues.push("Pacing trending downward");
        trendContext = "Declining";
      } else if (isIncreasing && pacingValue > 100) {
        trendContext = "Increasing";
      } else {
        trendContext = "On Track";
      }
    }

    // Check budget vs time alignment - only flag major misalignment
    const flightCompletion = calculateFlightCompletion(campaign.startDate, campaign.endDate);
    const budgetSpent = (campaign.spend / campaign.budget) * 100;
    const budgetTimeDiff = Math.abs(budgetSpent - flightCompletion);
    
    if (budgetTimeDiff > 40) {
      healthScore -= 15;
      if (budgetSpent > flightCompletion) {
        issues.push("Spending too fast relative to timeline");
      } else {
        issues.push("Spending too slow relative to timeline");
      }
    }

    // Check CTR - lower threshold
    const ctrValue = parseFloat(campaign.ctr);
    if (ctrValue < 0.3) {
      healthScore -= 15;
      issues.push("Very low CTR");
    }

    // Check ROAS - lower threshold
    const roasValue = parseFloat(campaign.roas);
    if (roasValue < 1.0) {
      healthScore -= 20;
      issues.push("Poor ROAS performance");
    }

    const healthResult = { 
      status: "healthy", 
      color: "bg-green-500", 
      label: "Healthy", 
      issues,
      trendContext,
      trendDirection
    };

    // Determine health status - adjusted thresholds
    if (healthScore >= 70) {
      healthResult.status = "healthy";
      healthResult.color = "bg-green-500";
      healthResult.label = "Healthy";
    } else if (healthScore >= 50) {
      healthResult.status = "warning";
      healthResult.color = "bg-yellow-500";
      healthResult.label = "Needs Attention";
    } else {
      healthResult.status = "critical";
      healthResult.color = "bg-red-500";
      healthResult.label = "Critical";
    }
    
    return healthResult;
  };

  const renderCampaignOptimizedCallout = () => (
    <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
      <Check className="w-3.5 h-3.5 shrink-0" />
      Campaign Optimized
    </div>
  );

  // Render optimization chips
  const renderOptimizationChips = (campaign: Campaign) => {
    if (campaign.status === "Paused" || campaign.status === "Draft") {
      return renderCampaignOptimizedCallout();
    }

    const optimizations = campaign.optimizations;
    
    // Unified chip style matching design spec
    const chipClass = "inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors border border-purple-200 whitespace-nowrap";

    // If it's a string (legacy format), parse it
    if (typeof optimizations === 'string') {
      // Handle different formats from the string
      if (optimizations.includes('🔼 Increase Bids')) {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button className={chipClass}>
                <Star className="w-3.5 h-3.5" />
                Increase Bids
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4" align="start">
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-2">
                  <span className="text-sm text-gray-600">Campaign Underspending</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Increase Bids</span>
                  <button className="ml-auto text-sm font-medium text-[#f26318] hover:text-[#d95414]">
                    Learn More
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      } else if (optimizations.includes('⭐ 2 Optimizations') || optimizations.includes('2 Optimizations')) {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button className={chipClass}>
                <Star className="w-3.5 h-3.5" />
                2 Optimizations
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-4" align="start">
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-2">
                  <span className="text-sm text-gray-600">Campaign Underspending</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Increase Bids</span>
                  <button className="ml-auto text-sm font-medium text-[#f26318] hover:text-[#d95414]">
                    Learn More
                  </button>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <span className="text-sm text-gray-600">Too Few Products</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Add Products</span>
                  <button className="ml-auto text-sm font-medium text-[#f26318] hover:text-[#d95414]">
                    Learn More
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      } else if (optimizations.includes('📦 Add Products')) {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button className={chipClass}>
                <Star className="w-3.5 h-3.5" />
                Add Products
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4" align="start">
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-2">
                  <span className="text-sm text-gray-600">Too Few Products</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Add Products</span>
                  <button className="ml-auto text-sm font-medium text-[#f26318] hover:text-[#d95414]">
                    Learn More
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      } else {
        return renderCampaignOptimizedCallout();
      }
    }

    if (typeof optimizations === "object" && optimizations !== null && optimizations.type === "complete") {
      return renderCampaignOptimizedCallout();
    }

    return renderCampaignOptimizedCallout();
  };

  const renderCampaignRow = (campaign: Campaign) => {
    const rowBg = 'bg-white';
    const hoverBg = 'hover:bg-gray-50';
    const hoverBgColor = 'bg-gray-50';
    const bgHex = '#ffffff';
    const hoverHex = '#f9fafb';
    const health = calculateCampaignHealth(campaign);

    return (
      <tr id={`campaign-${campaign.id}`} key={campaign.id} className={`group transition-colors ${rowBg} ${hoverBg}`}>
        <td 
          className={`${!isColumnVisible("name") && !isColumnVisible("id") ? "pinned-edge-right" : ""} sticky left-0 z-20 ${rowBg} group-hover:${hoverBgColor} pl-3 pr-1.5 py-2 w-[64px] min-w-[64px]`}
          style={{
            boxShadow: `10px 0 0 0 ${bgHex}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `10px 0 0 0 ${hoverHex}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `10px 0 0 0 ${bgHex}`;
          }}
        >
          <button
            onClick={() => {
              if (onUpdateCampaign) {
                if (campaign.status === "Running") {
                  setPauseConfirmCampaign(campaign);
                } else {
                  setResumeConfirmCampaign(campaign);
                }
              }
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
              campaign.status === "Running" ? "bg-[#f26318]" : "bg-gray-300"
            }`}
            title={campaign.status === "Running" ? "Pause campaign" : "Resume campaign"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                campaign.status === "Running" ? "translate-x-[18px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </td>
        <td
          className={`sticky left-[64px] z-20 ${rowBg} group-hover:${hoverBgColor} px-0 py-2 w-[28px] min-w-[28px]`}
          style={{ boxShadow: `-10px 0 0 0 ${bgHex}` }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `-10px 0 0 0 ${hoverHex}`; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `-10px 0 0 0 ${bgHex}`; }}
        >
          <div className="flex items-center justify-center">
            {starredCampaigns.has(campaign.id) ? (
              <button
                onClick={() => toggleStar(campaign.id)}
                className="shrink-0 transition-colors text-[#f26318] hover:text-orange-400 cursor-pointer"
                title="Remove from Watchlist"
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => toggleStar(campaign.id)}
                className="shrink-0 transition-colors text-gray-300 hover:text-[#f26318] cursor-pointer"
                title="Add to Watchlist"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
        {isColumnVisible("id") && <td 
          className={`${!isColumnVisible("name") ? "pinned-edge-right" : ""} sticky left-[92px] z-20 ${rowBg} group-hover:${hoverBgColor} pl-2 pr-3 py-2 w-[60px] min-w-[60px]`}
          style={{
            boxShadow: `10px 0 0 0 ${bgHex}, -10px 0 0 0 ${bgHex}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `10px 0 0 0 ${hoverHex}, -10px 0 0 0 ${hoverHex}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `10px 0 0 0 ${bgHex}, -10px 0 0 0 ${bgHex}`;
          }}
        >
          <div className="text-sm text-gray-900">{campaign.id}</div>
        </td>}
        {isColumnVisible("name") && <td 
          className={`pinned-edge-right sticky left-[152px] z-20 ${rowBg} group-hover:${hoverBgColor} px-2 py-2 w-[200px] min-w-[200px]`}
          style={{
            boxShadow: `-10px 0 0 0 ${bgHex}, 10px 0 0 0 ${bgHex}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `-10px 0 0 0 ${hoverHex}, 10px 0 0 0 ${hoverHex}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `-10px 0 0 0 ${bgHex}, 10px 0 0 0 ${bgHex}`;
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight" title={campaign.name}>{campaign.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="truncate">{campaign.category}</span>
            </div>
          </div>
        </td>}
        {isColumnVisible("status") && <td className="px-2 py-2 w-[72px]">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            campaign.status === "Running" 
              ? "bg-green-100 text-green-800"
              : campaign.status === "Paused"
              ? "bg-gray-100 text-gray-800"
              : "bg-blue-100 text-blue-800"
          }`}>
            {campaign.status}
          </span>
        </td>}
        {isColumnVisible("destination") && <td className="px-2 py-2 w-[88px]">
          <div className="flex items-center gap-1.5">
            <div className="shrink-0">{getPlatformIcon(campaign.platform)}</div>
            <span className="text-sm text-gray-900 leading-tight">{campaign.destination}</span>
          </div>
        </td>}
        {isColumnVisible("startDate") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">{campaign.startDate}</td>}
        {isColumnVisible("endDate") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          <div className="flex items-center gap-1 group/edit">
            <span>{campaign.endDate}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const parsed = new Date(campaign.endDate);
                const isoDate = !isNaN(parsed.getTime()) ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` : "";
                setEditValue(isoDate);
                setEditDialogOpen({ campaignId: campaign.id, field: "endDate" });
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 cursor-pointer"
              title="Edit end date"
            >
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </td>}
        {isColumnVisible("spend") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          ${campaign.spend.toLocaleString()}
        </td>}
        {isColumnVisible("budget") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          <div className="flex items-center gap-1 group/edit">
            <span>${campaign.budget.toLocaleString()}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditValue(String(campaign.budget));
                setEditBudgetFrequency("Lifetime");
                setEditDialogOpen({ campaignId: campaign.id, field: "budget" });
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 cursor-pointer"
              title="Edit budget"
            >
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </td>}
        {isColumnVisible("roasTotal") && <td className="px-2 py-2 w-[52px] text-sm text-gray-900 whitespace-nowrap">
          <span className="inline-flex items-center gap-0.5">{(campaign.roasTotal ?? campaign.roas)}<TrendArrow value={campaign.benchmarks?.roas?.wow} /></span>
        </td>}
        {isColumnVisible("roasOnline") && <td className="px-2 py-2 w-[52px] text-sm text-gray-900 whitespace-nowrap">{campaign.roasOnline ?? "-"}</td>}
        {isColumnVisible("roasOffline") && <td className="px-2 py-2 w-[56px] text-sm text-gray-900 whitespace-nowrap">{campaign.roasOffline ?? "-"}</td>}
        {isColumnVisible("ctr") && <td className="px-2 py-2 w-[48px] text-sm text-gray-900 whitespace-nowrap">
          <span className="inline-flex items-center gap-0.5">{campaign.ctr}<TrendArrow value={campaign.benchmarks?.ctr?.wow} /></span>
        </td>}
        {isColumnVisible("clicks") && <td className="px-2 py-2 w-[64px] text-sm text-gray-900 whitespace-nowrap">{(campaign.clicks ?? 0).toLocaleString()}</td>}
        {isColumnVisible("impressions") && <td className="px-2 py-2 w-[76px] text-sm text-gray-900 whitespace-nowrap">{(campaign.impressions ?? 0).toLocaleString()}</td>}
        {isColumnVisible("pacing") && <td className="px-2 py-2 w-[100px] whitespace-nowrap">
          <PacingPopover campaign={campaign} health={health}>
            <span className="group/pacing inline-flex items-center gap-1 cursor-pointer transition-all [&:hover_span]:font-[600]">
              <span className="transition-all inline-flex items-center gap-0.5">{getPacingIndicator(campaign.pacing, health, campaign)}<TrendArrow value={campaign.benchmarks?.pacing?.wow} /></span>
              <svg className="w-3 h-3 text-muted-foreground group-hover/pacing:text-primary transition-colors shrink-0" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </PacingPopover>
        </td>}
        {isColumnVisible("budgetAtRisk") && <td className="px-2 py-2 w-[90px] text-sm whitespace-nowrap">
          {(() => {
            const pacingNum = parseFloat(campaign.pacing);
            if (isNaN(pacingNum) || campaign.status === "Draft" || campaign.status === "Ended") return <span className="text-gray-400">-</span>;
            const flightPct = calculateFlightCompletion(campaign.startDate, campaign.endDate) / 100;
            const projectedTotal = flightPct > 0 ? campaign.spend / flightPct : 0;
            const atRisk = projectedTotal - campaign.budget;
            if (atRisk <= 0) return <span className="text-green-600">$0</span>;
            return <span className="text-red-600">${atRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>;
          })()}
        </td>}
        {isColumnVisible("lastModified") && <td className="px-2 py-2 w-[75px] text-sm text-gray-500">
          <span className="leading-tight">{campaign.lastModified || "N/A"}</span>
        </td>}
        {isColumnVisible("brandId") && <td className="px-2 py-2 w-[80px]">
          <div className="text-sm text-gray-900">{campaign.brandId || '-'}</div>
        </td>}
        {isColumnVisible("objective") && <td className="px-2 py-2 w-[110px] text-sm text-gray-900 whitespace-nowrap">{campaign.objective || "-"}</td>}
        {isColumnVisible("mediaChannel") && <td className="px-2 py-2 w-[110px] text-sm text-gray-900 whitespace-nowrap">{campaign.mediaChannel || "-"}</td>}
        {isColumnVisible("platform") && <td className="px-2 py-2 w-[100px] text-sm text-gray-900 whitespace-nowrap">{campaign.platform || "-"}</td>}
        {isColumnVisible("flightCompleted") && <td className="px-2 py-2 w-[68px] text-sm text-gray-900 whitespace-nowrap">{calculateFlightCompletion(campaign.startDate, campaign.endDate).toFixed(2)}%</td>}
        {isColumnVisible("budgetSpent") && <td className="px-2 py-2 w-[68px] text-sm text-gray-900 whitespace-nowrap">{((campaign.spend / campaign.budget) * 100).toFixed(2)}%</td>}
        {isColumnVisible("remainingBudget") && <td className="px-2 py-2 w-[82px] text-sm text-gray-900 whitespace-nowrap">${(campaign.budget - campaign.spend).toLocaleString()}</td>}
        {isColumnVisible("cpc") && <td className="px-2 py-2 w-[52px] text-sm text-gray-900 whitespace-nowrap">
          <span>{campaign.cpc || '-'}</span>
        </td>}
        {isColumnVisible("cpm") && <td className="px-2 py-2 w-[52px] text-sm text-gray-900 whitespace-nowrap">
          {campaign.cpm || '-'}
        </td>}
        {isColumnVisible("conversionRate") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          {campaign.conversionRate || '-'}
        </td>}
        {isColumnVisible("totalSales") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          {campaign.totalSales ?? campaign.sales ?? "-"}
        </td>}
        {isColumnVisible("onlineSales") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">{campaign.onlineSales ?? "-"}</td>}
        {isColumnVisible("offlineSales") && <td className="px-2 py-2 w-[82px] text-sm text-gray-900 whitespace-nowrap">{campaign.offlineSales ?? "-"}</td>}
        {isColumnVisible("mediaPlan") && <td className="px-2 py-2 w-[100px] text-sm text-gray-900 whitespace-nowrap">
          {campaign.mediaPlan || '-'}
        </td>}
        {isColumnVisible("optimizations") && <td
          className={`pinned-edge-left sticky right-[40px] z-20 ${rowBg} group-hover:${hoverBgColor} pl-3 pr-2 py-2 w-[160px] min-w-[160px]`}
          style={{
            boxShadow: `-10px 0 0 0 ${bgHex}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `-10px 0 0 0 ${hoverHex}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `-10px 0 0 0 ${bgHex}`;
          }}
        >
          {renderOptimizationChips(campaign)}
        </td>}
        <td 
          className={`sticky right-0 z-20 ${rowBg} group-hover:${hoverBgColor} px-2 py-2 w-[40px] min-w-[40px]`}
          style={{
            boxShadow: `-1px 0 0 0 ${bgHex}, 10px 0 0 0 ${bgHex}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `-1px 0 0 0 ${hoverHex}, 10px 0 0 0 ${hoverHex}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `-1px 0 0 0 ${bgHex}, 10px 0 0 0 ${bgHex}`;
          }}
        >
          <Popover open={campaignMenuOpen === campaign.id} onOpenChange={(open) => setCampaignMenuOpen(open ? campaign.id : null)}>
            <PopoverTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="end">
              <button
                onClick={() => setCampaignMenuOpen(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <div
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-400 rounded cursor-default"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Campaign</span>
              </div>
              <div
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-400 rounded cursor-default"
              >
                <Store className="w-4 h-4" />
                <span>Duplicate to Another Store</span>
              </div>
              <div className="my-1 border-t border-gray-200" />
              <button
                onClick={() => setCampaignMenuOpen(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>{campaign.status === "Draft" ? "Delete Draft" : "End Campaign"}</span>
              </button>
            </PopoverContent>
          </Popover>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">

      {/* Custom View Dialog */}
      <Dialog open={showCustomViewDialog} onOpenChange={setShowCustomViewDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Custom View</DialogTitle>
            <DialogDescription>
              Give your custom view a name. This will save all your current filters, sorting, and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter view name..."
              value={customViewName}
              onChange={(e) => setCustomViewName(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCustomViewDialog(false);
                setCustomViewName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // TODO: Save the custom view with the name
                console.log("Saving custom view:", customViewName);
                if (onSaveCustomView) {
                  onSaveCustomView(customViewName);
                }
                setShowCustomViewDialog(false);
                setCustomViewName("");
              }}
              disabled={!customViewName.trim()}
            >
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Filter Chips Row - Quick filter pills (grouped) + advanced filter chips */}
      {((quickFilters?.status?.length ?? 0) > 0 || (quickFilters?.adTypes?.length ?? 0) > 0 || (quickFilters?.platform?.length ?? 0) > 0 || (quickFilters?.objective?.length ?? 0) > 0 || (quickFilters?.mediaPlan?.length ?? 0) > 0 || appliedFilters.some(f => f.field !== 'status' && f.values.length > 0)) && (
        <div className="border-b border-border bg-background px-4 py-2.5" style={{ fontFamily: 'var(--font-family-inter)' }}>
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground shrink-0" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>{displayCampaigns.length} Campaigns Matched</span>
              {/* Quick filter grouped pills */}
              {(quickFilters?.status?.length ?? 0) > 0 && (
                <button
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f26318]/10 text-[#f26318] shrink-0 hover:bg-[#f26318]/20 transition-colors cursor-pointer"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                  onClick={() => onOpenQuickFilter?.("status")}
                >
                  <span className="font-medium">Status:</span>
                  <span>{quickFilters!.status.join(", ")}</span>
                  <span role="button" onClick={(e) => { e.stopPropagation(); onRemoveQuickFilter?.("status", "__all__"); }} className="hover:text-[#f26318]/60"><X className="w-3 h-3" /></span>
                </button>
              )}
              {(quickFilters?.adTypes?.length ?? 0) > 0 && (
                <button
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f26318]/10 text-[#f26318] shrink-0 hover:bg-[#f26318]/20 transition-colors cursor-pointer"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                  onClick={() => onOpenQuickFilter?.("adTypes")}
                >
                  <span className="font-medium">Ad Type:</span>
                  <span>{quickFilters!.adTypes.join(", ")}</span>
                  <span role="button" onClick={(e) => { e.stopPropagation(); onRemoveQuickFilter?.("adTypes", "__all__"); }} className="hover:text-[#f26318]/60"><X className="w-3 h-3" /></span>
                </button>
              )}
              {(quickFilters?.platform?.length ?? 0) > 0 && (
                <button
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f26318]/10 text-[#f26318] shrink-0 hover:bg-[#f26318]/20 transition-colors cursor-pointer"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                  onClick={() => onOpenQuickFilter?.("platform")}
                >
                  <span className="font-medium">Platform:</span>
                  <span>{quickFilters!.platform.join(", ")}</span>
                  <span role="button" onClick={(e) => { e.stopPropagation(); onRemoveQuickFilter?.("platform", "__all__"); }} className="hover:text-[#f26318]/60"><X className="w-3 h-3" /></span>
                </button>
              )}
              {(quickFilters?.objective?.length ?? 0) > 0 && (
                <button
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f26318]/10 text-[#f26318] shrink-0 hover:bg-[#f26318]/20 transition-colors cursor-pointer"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                  onClick={() => onOpenQuickFilter?.("objective")}
                >
                  <span className="font-medium">Objective:</span>
                  <span>{quickFilters!.objective.join(", ")}</span>
                  <span role="button" onClick={(e) => { e.stopPropagation(); onRemoveQuickFilter?.("objective", "__all__"); }} className="hover:text-[#f26318]/60"><X className="w-3 h-3" /></span>
                </button>
              )}
              {/* Advanced/view-level filter chips */}
              {appliedFilters.filter(filter => filter.field !== 'status' && filter.values.length > 0).map((filter) => filter.values.map((value) => (
                <button
                  key={`${filter.id}-${value}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent shrink-0 hover:bg-accent/20 transition-colors cursor-pointer"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                  onClick={() => onOpenAdvancedFilters?.()}
                  title="Click to edit in Advanced Filters"
                >
                  <span>
                    {getFilterFieldLabel(filter.field)}: {filter.operator && filter.operator !== "is" ? `${filter.operator} ` : ""}{formatFilterValue(filter.field, value)}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); removeAppliedFilter(filter.id); }}
                    className="hover:text-accent/80"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              )))}
            </div>
            <button
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}
              onClick={() => {
                setAppliedFilters([]);
                onClearAllFilters?.();
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}



      {/* Table — clip wrapper hides native horizontal scrollbar; overflow-auto inside for sticky support */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
      <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-auto relative" style={{ height: 'calc(100% + 20px)', marginBottom: '-20px' }}>
        <table className="w-full" style={{ minWidth: `${tableMinWidth}px` }}>
          <thead>
            {/* Column Headers */}
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`${!isColumnVisible("id") && !isColumnVisible("name") ? "pinned-edge-right" : ""} sticky left-0 top-0 z-30 bg-gray-50 pl-3 pr-1.5 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[64px]`} style={{ boxShadow: '10px 0 0 0 rgb(249,250,251)' }}>
                <span className="text-xs leading-tight block whitespace-nowrap">ON/OFF</span>
              </th>
              <th className="sticky left-[64px] top-0 z-30 bg-gray-50 px-0 py-2 w-[28px] min-w-[28px]" style={{ boxShadow: '-10px 0 0 0 rgb(249,250,251)' }}></th>
              {isColumnVisible("id") && <th className={`${!isColumnVisible("name") ? "pinned-edge-right" : ""} sticky left-[92px] top-0 z-30 bg-gray-50 pl-2 pr-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[60px] min-w-[60px]`} style={{ boxShadow: '10px 0 0 0 rgb(249,250,251), -10px 0 0 0 rgb(249,250,251)' }}>
                <div className={`flex items-center gap-1 ${isSortActive("id") ? "text-gray-900" : ""}`}>
                  ID
                  <SortIcon column="id" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">ID</div>
                        <p className="text-gray-600">A unique numerical identifier automatically assigned to each campaign for tracking and reference. Use this ID when communicating with support or referencing campaigns in reports.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("name") && <th className="pinned-edge-right sticky left-[152px] top-0 z-30 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[200px] min-w-[200px]" style={{ boxShadow: '10px 0 0 0 rgb(249,250,251), -10px 0 0 0 rgb(249,250,251)' }}>
                <div className={`flex items-center gap-1 ${isSortActive("name") ? "text-gray-900" : ""}`}>
                  Name
                  <SortIcon column="name" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Name</div>
                        <p className="text-gray-600">The display name of the campaign as set during creation. This is the primary label used to identify and search for the campaign across the platform.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("status") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[72px]">
                <div className={`flex items-center gap-1 ${isSortActive("status") ? "text-gray-900" : ""}`}>
                  Status
                  <SortIcon column="status" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Status</div>
                        <p className="text-gray-600">The current lifecycle state of the campaign. Possible values include Running, Paused, Draft, Scheduled, Ended, On Hold, and Rejected. Status determines whether the campaign is actively serving ads.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("destination") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[88px]">
                <div className={`flex items-center gap-1 ${isSortActive("destination") ? "text-gray-900" : ""}`}>
                  Ad Type
                  <SortIcon column="destination" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Ad Type</div>
                        <p className="text-gray-600">The channel or ad product the campaign uses (for example Search, Performance Max, or a social platform). Indicates how and where ads are served.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("startDate") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("startDate") ? "text-gray-900" : ""}`}>
                  Start Date
                  <SortIcon column="startDate" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Start Date</div>
                        <p className="text-gray-600">The date the campaign is scheduled to begin serving ads. Campaigns in Draft or Scheduled status will activate on this date if approved.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("endDate") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("endDate") ? "text-gray-900" : ""}`}>
                  End Date
                  <SortIcon column="endDate" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">End Date</div>
                        <p className="text-gray-600">The date the campaign is scheduled to stop serving ads. Once the end date is reached, the campaign status will transition to Ended and no further spend will occur.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("spend") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("spend") ? "text-gray-900" : ""}`}>
                  Spend
                  <SortIcon column="spend" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Spend</div>
                        <p className="text-gray-600">The cumulative amount of budget that has been spent on the campaign from launch to date. This includes all ad placements and impressions served across the campaign's media channels.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("budget") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("budget") ? "text-gray-900" : ""}`}>
                  Budget
                  <SortIcon column="budget" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Budget</div>
                        <p className="text-gray-600">The total allocated budget for the campaign over its entire flight. This is the maximum amount authorised to be spent from the start date through to the end date.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("roasTotal") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[52px]">
                <div className={`flex items-center gap-1 ${isSortActive("roasTotal") ? "text-gray-900" : ""}`}>
                  <div>Total<br/>ROAS</div>
                  <SortIcon column="roasTotal" />
                </div>
              </th>}
              {isColumnVisible("roasOnline") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[52px]">
                <div className={`flex items-center gap-1 ${isSortActive("roasOnline") ? "text-gray-900" : ""}`}>
                  <div>Online<br/>ROAS</div>
                  <SortIcon column="roasOnline" />
                </div>
              </th>}
              {isColumnVisible("roasOffline") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[56px]">
                <div className={`flex items-center gap-1 ${isSortActive("roasOffline") ? "text-gray-900" : ""}`}>
                  <div>Offline<br/>ROAS</div>
                  <SortIcon column="roasOffline" />
                </div>
              </th>}
              {isColumnVisible("ctr") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[48px]">
                <div className={`flex items-center gap-1 ${isSortActive("ctr") ? "text-gray-900" : ""}`}>
                  CTR
                  <SortIcon column="ctr" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">CTR (Click-Through Rate)</div>
                        <p className="text-gray-600">Click-Through Rate. The percentage of ad impressions that resulted in a user clicking through to the destination. Calculated as total clicks divided by total impressions, expressed as a percentage. A higher CTR generally indicates more engaging ad creative.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("clicks") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[64px]">
                <div className={`flex items-center gap-1 ${isSortActive("clicks") ? "text-gray-900" : ""}`}>
                  Clicks
                  <SortIcon column="clicks" />
                </div>
              </th>}
              {isColumnVisible("impressions") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[76px]">
                <div className={`flex items-center gap-1 ${isSortActive("impressions") ? "text-gray-900" : ""}`}>
                  <div>Impr.</div>
                  <SortIcon column="impressions" />
                </div>
              </th>}
              {isColumnVisible("pacing") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[100px]">
                <div className={`flex items-center gap-1 ${isSortActive("pacing") ? "text-gray-900" : ""}`}>
                  Pacing
                  <SortIcon column="pacing" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Pacing</div>
                        <p className="text-gray-600">Measures how campaign spend is tracking relative to the ideal spending rate. Calculated by comparing actual spend against expected spend based on the campaign timeline and total budget. A value near 100% indicates the campaign is on track to fully utilise its budget by the end date.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("budgetAtRisk") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[90px]">
                <div className={`flex items-center gap-1 ${isSortActive("budgetAtRisk") ? "text-gray-900" : ""}`}>
                  <div>Budget<br/>at Risk</div>
                  <SortIcon column="budgetAtRisk" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Budget at Risk</div>
                        <p className="text-gray-600">The estimated dollar amount of overspend projected at the current pace. Calculated by projecting total spend to end of flight based on current spend rate relative to flight completion. $0 means the campaign is on track or underpacing.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("lastModified") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[75px]">
                <div className={`flex items-center gap-1 ${isSortActive("lastModified") ? "text-gray-900" : ""}`}>
                  <div>Last<br/>Modified</div>
                  <SortIcon column="lastModified" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Last Modified</div>
                        <p className="text-gray-600">The date and time the campaign was last updated or edited. This includes any changes to settings, budget, creative, targeting, or status. The table is sorted by this column in descending order by default.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("brandId") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[80px]">
                <div className={`flex items-center gap-1 ${isSortActive("brandId") ? "text-gray-900" : ""}`}>
                  Brand ID
                  <SortIcon column="brandId" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Brand ID</div>
                        <p className="text-gray-600">The unique identifier for the brand or advertiser associated with this campaign. Used to group and filter campaigns by brand within a multi-brand account.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("objective") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[110px]">
                <div className={`flex items-center gap-1 ${isSortActive("objective") ? "text-gray-900" : ""}`}>
                  Objective
                  <SortIcon column="objective" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Objective</div>
                        <p className="text-gray-600">The primary marketing goal of the campaign. Objectives such as Awareness, Consideration, Conversion, or Sales determine how the campaign is optimised and which key performance indicators are prioritised.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("mediaChannel") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[110px]">
                <div className={`flex items-center gap-1 ${isSortActive("mediaChannel") ? "text-gray-900" : ""}`}>
                  <div>Media<br/>Channel</div>
                  <SortIcon column="mediaChannel" />
                </div>
              </th>}
              {isColumnVisible("platform") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[100px]">
                <div className={`flex items-center gap-1 ${isSortActive("platform") ? "text-gray-900" : ""}`}>
                  Platform
                  <SortIcon column="platform" />
                </div>
              </th>}
              {isColumnVisible("flightCompleted") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[68px]">
                <div className={`flex items-center gap-1 ${isSortActive("flightCompleted") ? "text-gray-900" : ""}`}>
                  <div>% Flight<br/>Completed</div>
                  <SortIcon column="flightCompleted" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">% Flight Completed</div>
                        <p className="text-gray-600">The percentage of the campaign's total scheduled duration (flight) that has elapsed. Calculated from the start date to the end date relative to today's date. Helps assess how far along a campaign is in its timeline.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("budgetSpent") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[68px]">
                <div className={`flex items-center gap-1 ${isSortActive("budgetSpent") ? "text-gray-900" : ""}`}>
                  <div>% Budget<br/>Spent</div>
                  <SortIcon column="budgetSpent" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">% Budget Spent</div>
                        <p className="text-gray-600">The percentage of the total campaign budget that has been spent to date. Calculated as total spend divided by total budget. Compare this with % Flight Completed to assess whether the campaign is on track financially.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("remainingBudget") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[82px]">
                <div className={`flex items-center gap-1 ${isSortActive("remainingBudget") ? "text-gray-900" : ""}`}>
                  <div>Remaining<br/>Budget</div>
                  <SortIcon column="remainingBudget" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Remaining Budget</div>
                        <p className="text-gray-600">The amount of unspent budget remaining for the campaign. Calculated as total budget minus spend to date. Indicates how much budget is still available to be deployed before the campaign flight ends.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("cpc") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[52px]">
                <div className={`flex items-center gap-1 ${isSortActive("cpc") ? "text-gray-900" : ""}`}>
                  CPC
                  <SortIcon column="cpc" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">CPC (Cost Per Click)</div>
                        <p className="text-gray-600">Cost Per Click. The average cost incurred for each individual click on your ad. Calculated by dividing total spend by the total number of clicks received. Lower CPC values indicate more cost-efficient traffic acquisition.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("cpm") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[52px]">
                <div className={`flex items-center gap-1 ${isSortActive("cpm") ? "text-gray-900" : ""}`}>
                  CPM
                  <SortIcon column="cpm" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">CPM (Cost Per Mille)</div>
                        <p className="text-gray-600">Cost Per Mille (thousand impressions). The cost incurred for every 1,000 ad impressions served. Calculated by dividing total spend by total impressions, then multiplying by 1,000. A key metric for evaluating the cost-efficiency of awareness and reach campaigns.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("conversionRate") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("conversionRate") ? "text-gray-900" : ""}`}>
                  <div>Conversion<br/>Rate</div>
                  <SortIcon column="conversionRate" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Conversion Rate</div>
                        <p className="text-gray-600">The percentage of ad clicks that resulted in a completed conversion or desired action, such as a purchase, sign-up, or add-to-cart. Calculated as total conversions divided by total clicks. A critical indicator of how effectively traffic is being converted.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("totalSales") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("totalSales") ? "text-gray-900" : ""}`}>
                  <div>Total<br/>Sales</div>
                  <SortIcon column="totalSales" />
                </div>
              </th>}
              {isColumnVisible("onlineSales") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("onlineSales") ? "text-gray-900" : ""}`}>
                  <div>Online<br/>Sales</div>
                  <SortIcon column="onlineSales" />
                </div>
              </th>}
              {isColumnVisible("offlineSales") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[82px]">
                <div className={`flex items-center gap-1 ${isSortActive("offlineSales") ? "text-gray-900" : ""}`}>
                  <div>Offline<br/>Sales</div>
                  <SortIcon column="offlineSales" />
                </div>
              </th>}
              {isColumnVisible("mediaPlan") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[100px]">
                <div className={`flex items-center gap-1 ${isSortActive("mediaPlan") ? "text-gray-900" : ""}`}>
                  Media Plan
                  <SortIcon column="mediaPlan" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Media Plan</div>
                        <p className="text-gray-600">The associated media plan document outlining the campaign's strategic media buying approach and channel allocation. Links this campaign to its broader planning framework and budget allocation strategy.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              {isColumnVisible("optimizations") && <th className="pinned-edge-left sticky right-[40px] top-0 z-30 bg-gray-50 pl-3 pr-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[160px] min-w-[160px]" style={{ boxShadow: '-10px 0 0 0 rgb(249,250,251)' }}>
                <div className="flex items-center gap-1">
                  Optimizations
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Optimizations</div>
                        <p className="text-gray-600">Suggested actions and recommendations to improve campaign performance. These may include bid adjustments, audience refinements, creative updates, and budget reallocations identified by the platform's optimisation engine.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>}
              <th className="sticky right-0 top-0 z-30 bg-gray-50 px-2 py-2 w-[40px] min-w-[40px]" style={{ boxShadow: '-1px 0 0 0 rgb(249,250,251), 10px 0 0 0 rgb(249,250,251)' }}>
              </th>

            </tr>
          </thead>
          
          {/* Aggregation Row */}
          <tbody className="bg-gray-50">
            <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
              <td
                className="sticky left-0 top-[33px] z-10 bg-gray-50 pl-3 pr-1.5 py-2 text-sm text-gray-900 whitespace-nowrap"
                colSpan={1 + 1 + (isColumnVisible("id") ? 1 : 0) + (isColumnVisible("name") ? 1 : 0)}
                style={{ boxShadow: '10px 0 0 0 rgb(249,250,251)' }}
              >
                Total for {displayCampaigns.length.toLocaleString()} Campaigns
              </td>
              
              {isColumnVisible("status") && <td className="px-2 py-2"></td>}
              {isColumnVisible("destination") && <td className="px-2 py-2"></td>}
              {isColumnVisible("startDate") && <td className="px-2 py-2"></td>}
              {isColumnVisible("endDate") && <td className="px-2 py-2"></td>}

              {isColumnVisible("spend") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  ${(displayCampaigns.reduce((sum, c) => sum + c.spend, 0) / 1000000).toFixed(0)}M
                </td>
              )}
              
              {isColumnVisible("budget") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  ${(displayCampaigns.reduce((sum, c) => sum + c.budget, 0) / 1000000000).toFixed(1)}B
                </td>
              )}
              
              {isColumnVisible("roasTotal") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.length > 0
                    ? `${(displayCampaigns.reduce((sum, c) => sum + parseFloat((c.roasTotal ?? c.roas).replace("x", "")), 0) / displayCampaigns.length).toFixed(2)}x`
                    : "-"}
                </td>
              )}
              {isColumnVisible("roasOnline") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.length > 0
                    ? `${(displayCampaigns.reduce((sum, c) => sum + parseFloat((c.roasOnline || "0").replace("x", "")), 0) / displayCampaigns.length).toFixed(2)}x`
                    : "-"}
                </td>
              )}
              {isColumnVisible("roasOffline") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.length > 0
                    ? `${(displayCampaigns.reduce((sum, c) => sum + parseFloat((c.roasOffline || "0").replace("x", "")), 0) / displayCampaigns.length).toFixed(2)}x`
                    : "-"}
                </td>
              )}
              
              {isColumnVisible("ctr") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.length > 0
                    ? `${(displayCampaigns.reduce((sum, c) => sum + parseFloat(c.ctr.replace('%', '')), 0) / displayCampaigns.length).toFixed(2)}%`
                    : '-'
                  }
                </td>
              )}

              {isColumnVisible("clicks") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0).toLocaleString()}
                </td>
              )}
              {isColumnVisible("impressions") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0).toLocaleString()}
                </td>
              )}

              {isColumnVisible("pacing") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.length > 0
                    ? `${(displayCampaigns.reduce((sum, c) => sum + parseFloat(c.pacing.replace('%', '')), 0) / displayCampaigns.length).toFixed(1)}%`
                    : '-'
                  }
                </td>
              )}

              {isColumnVisible("budgetAtRisk") && (
                <td className="px-2 py-2 text-sm text-red-600">
                  {(() => {
                    const total = displayCampaigns.reduce((sum, c) => {
                      const pacing = parseFloat(c.pacing);
                      if (isNaN(pacing) || c.status === "Draft" || c.status === "Ended") return sum;
                      const flightPct = calculateFlightCompletion(c.startDate, c.endDate) / 100;
                      const projected = flightPct > 0 ? c.spend / flightPct : 0;
                      const risk = projected - c.budget;
                      return sum + (risk > 0 ? risk : 0);
                    }, 0);
                    return total > 0 ? `$${(total / 1000).toFixed(0)}K` : '$0';
                  })()}
                </td>
              )}

              {isColumnVisible("lastModified") && <td className="px-2 py-2"></td>}
              {isColumnVisible("brandId") && <td className="px-2 py-2"></td>}
              {isColumnVisible("objective") && <td className="px-2 py-2"></td>}
              {isColumnVisible("mediaChannel") && <td className="px-2 py-2"></td>}
              {isColumnVisible("platform") && <td className="px-2 py-2"></td>}
              {isColumnVisible("flightCompleted") && <td className="px-2 py-2"></td>}
              
              {isColumnVisible("budgetSpent") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {(() => {
                    const totalBudget = displayCampaigns.reduce((sum, c) => sum + c.budget, 0);
                    const totalSpend = displayCampaigns.reduce((sum, c) => sum + c.spend, 0);
                    return totalBudget > 0 ? `${((totalSpend / totalBudget) * 100).toFixed(1)}%` : '-';
                  })()}
                </td>
              )}
              
              {isColumnVisible("remainingBudget") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  ${((displayCampaigns.reduce((sum, c) => sum + c.budget, 0) - displayCampaigns.reduce((sum, c) => sum + c.spend, 0)) / 1000000).toFixed(0)}M
                </td>
              )}


              {isColumnVisible("cpc") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.filter(c => c.cpc).length > 0 
                    ? `$${(displayCampaigns.filter(c => c.cpc).reduce((sum, c) => sum + parseFloat(c.cpc!.replace('$', '')), 0) / displayCampaigns.filter(c => c.cpc).length).toFixed(2)}`
                    : '-'
                  }
                </td>
              )}
              
              {isColumnVisible("cpm") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.filter(c => c.cpm).length > 0 
                    ? `$${(displayCampaigns.filter(c => c.cpm).reduce((sum, c) => sum + parseFloat(c.cpm!.replace('$', '')), 0) / displayCampaigns.filter(c => c.cpm).length).toFixed(2)}`
                    : '-'
                  }
                </td>
              )}
              
              {isColumnVisible("conversionRate") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.filter(c => c.conversionRate).length > 0 
                    ? `${(displayCampaigns.filter(c => c.conversionRate).reduce((sum, c) => sum + parseFloat(c.conversionRate!.replace('%', '')), 0) / displayCampaigns.filter(c => c.conversionRate).length).toFixed(2)}%`
                    : '-'
                  }
                </td>
              )}
              
              {isColumnVisible("totalSales") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {(() => {
                    const sum = displayCampaigns.reduce(
                      (s, c) => s + parseNumericStr(c.totalSales ?? c.sales),
                      0,
                    );
                    return sum > 0 ? `$${(sum / 1_000_000).toFixed(2)}M` : "-";
                  })()}
                </td>
              )}
              {isColumnVisible("onlineSales") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {(() => {
                    const sum = displayCampaigns.reduce((s, c) => s + parseNumericStr(c.onlineSales), 0);
                    return sum > 0 ? `$${(sum / 1_000_000).toFixed(2)}M` : "-";
                  })()}
                </td>
              )}
              {isColumnVisible("offlineSales") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {(() => {
                    const sum = displayCampaigns.reduce((s, c) => s + parseNumericStr(c.offlineSales), 0);
                    return sum > 0 ? `$${(sum / 1_000_000).toFixed(2)}M` : "-";
                  })()}
                </td>
              )}
              
              {isColumnVisible("mediaPlan") && <td className="px-2 py-2"></td>}
              {isColumnVisible("optimizations") && <td className="pinned-edge-left sticky right-[40px] top-[33px] z-10 bg-gray-50 pl-3 pr-2 py-2 w-[160px] min-w-[160px]" style={{ boxShadow: '-10px 0 0 0 rgb(249,250,251)' }}>
                {renderCampaignOptimizedCallout()}
              </td>}
              <td className="sticky right-0 top-[33px] z-10 bg-gray-50 px-2 py-2 w-[40px] min-w-[40px]" style={{ boxShadow: '-1px 0 0 0 rgb(249,250,251)' }}></td>
            </tr>
          </tbody>
          
          <tbody className="divide-y divide-gray-200">
            {paginatedCampaigns.map((campaign) => renderCampaignRow(campaign))}
          </tbody>
        </table>

        {/* Spacer: must be >= 20px to compensate for the hidden-overflow scrollbar hack */}
        <div className="h-[20px] shrink-0" />
      </div>
      </div>

      {/* Persistent horizontal scrollbar �� only spans the scrollable (non-pinned) section */}
      <div className="flex shrink-0 border-t border-gray-100" style={{ height: '14px' }}>
        <div style={{ width: `${leftPinnedWidth}px`, flexShrink: 0 }} />
        <div
          ref={scrollbarRef}
          onScroll={handleScrollbarScroll}
          className="flex-1 overflow-x-auto overflow-y-hidden min-w-0"
          style={{ height: '14px' }}
        >
          <div style={{ width: `${Math.max(0, scrollContentWidth - leftPinnedWidth - rightPinnedWidth)}px`, height: '1px' }} />
        </div>
        <div style={{ width: `${rightPinnedWidth}px`, flexShrink: 0 }} />
      </div>

      {/* Pagination Controls — frozen outside scroll container */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-t border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">Rows per page</span>
          <Select value={rowsPerPageDisplay} onValueChange={setRowsPerPageDisplay}>
            <SelectTrigger size="sm" className="w-[4.5rem] h-8 bg-white border-gray-300 text-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Customizer Drawer */}
      <FilterCustomizer
        open={showFilterCustomizer}
        onOpenChange={setShowFilterCustomizer}
        currentFilters={appliedFilters}
        onApplyFilters={(filters) => {
          // Keep all filter rows with a field selected (including preloaded template rows)
          setAppliedFilters(filters);
          setShowFilterCustomizer(false);
        }}
      />

      {/* Edit End Date Dialog */}
      <Dialog open={editDialogOpen?.field === "endDate"} onOpenChange={(open) => { if (!open) { setEditDialogOpen(null); setEditNote(""); setShowEditNote(false); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit End Date</DialogTitle>
            <DialogDescription>
              Current end date: {editDialogOpen ? campaigns.find(c => c.id === editDialogOpen.campaignId)?.endDate : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New End Date</label>
              <input
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318]"
              />
            </div>
            {!showEditNote ? (
              <button
                type="button"
                onClick={() => setShowEditNote(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#f26318] hover:text-[#d9550f] font-medium transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Leave a note
              </button>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318] resize-y"
                  placeholder="Why are you changing this end date?"
                  autoFocus
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(null); setEditNote(""); setShowEditNote(false); }}>
              Cancel
            </Button>
            <Button
              className="bg-[#f26318] hover:bg-[#d9550f] text-white"
              onClick={() => {
                if (editValue && onUpdateCampaign && editDialogOpen) {
                  const d = new Date(editValue + "T00:00:00");
                  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  const formatted = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                  onUpdateCampaign(editDialogOpen.campaignId, { endDate: formatted });
                  toast.success(`End date updated to ${formatted}${editNote ? " (note saved)" : ""}`);
                }
                setEditDialogOpen(null);
                setEditNote("");
                setShowEditNote(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={editDialogOpen?.field === "budget"} onOpenChange={(open) => { if (!open) { setEditDialogOpen(null); setEditNote(""); setShowEditNote(false); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Current budget: ${editDialogOpen ? campaigns.find(c => c.id === editDialogOpen.campaignId)?.budget.toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  min={0}
                  step={100}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget Frequency</label>
              <select
                value={editBudgetFrequency}
                onChange={(e) => setEditBudgetFrequency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318] cursor-pointer"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Lifetime">Lifetime</option>
              </select>
            </div>
            {!showEditNote ? (
              <button
                type="button"
                onClick={() => setShowEditNote(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#f26318] hover:text-[#d9550f] font-medium transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Leave a note
              </button>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318] resize-y"
                  placeholder="Why are you changing this budget?"
                  autoFocus
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(null); setEditNote(""); setShowEditNote(false); }}>
              Cancel
            </Button>
            <Button
              className="bg-[#f26318] hover:bg-[#d9550f] text-white"
              onClick={() => {
                const num = parseFloat(editValue);
                if (!isNaN(num) && num >= 0 && onUpdateCampaign && editDialogOpen) {
                  onUpdateCampaign(editDialogOpen.campaignId, { budget: num });
                  toast.success(`Budget updated to $${num.toLocaleString()} (${editBudgetFrequency})${editNote ? " (note saved)" : ""}`);
                }
                setEditDialogOpen(null);
                setEditNote("");
                setShowEditNote(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pauseConfirmCampaign} onOpenChange={(open) => { if (!open) { setPauseConfirmCampaign(null); setPauseNote(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Campaign</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to pause <span className="font-medium text-gray-900">{pauseConfirmCampaign?.name}</span>? This campaign will stop serving ads immediately.
                </p>
                {(selectedStatuses.length > 0 || selectedAdTypes.length > 0 || selectedPacing.length > 0 || selectedObjectives.length > 0 || selectedBrandIds.length > 0 || searchQuery || appliedFilters.length > 0) && (
                  <p className="text-amber-600 text-sm flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" />
                    Based on your current filters, this campaign may no longer appear in the table once paused.
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave a note</label>
                  <textarea
                    value={pauseNote}
                    onChange={(e) => setPauseNote(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                    placeholder="Why are you pausing this campaign?"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#f26318] hover:bg-[#d9550f] text-white"
              onClick={() => {
                if (pauseConfirmCampaign && onUpdateCampaign) {
                  onUpdateCampaign(pauseConfirmCampaign.id, { status: "Paused" as Campaign["status"] });
                  toast.success(`"${pauseConfirmCampaign.name}" has been paused`);
                }
                setPauseConfirmCampaign(null);
                setPauseNote("");
              }}
            >
              Pause Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resumeConfirmCampaign} onOpenChange={(open) => { if (!open) { setResumeConfirmCampaign(null); setResumeNote(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Campaign</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to resume <span className="font-medium text-gray-900">{resumeConfirmCampaign?.name}</span>? This campaign will start serving ads immediately.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave a note</label>
                  <textarea
                    value={resumeNote}
                    onChange={(e) => setResumeNote(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                    placeholder="Why are you resuming this campaign?"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#f26318] hover:bg-[#d9550f] text-white"
              onClick={() => {
                if (resumeConfirmCampaign && onUpdateCampaign) {
                  onUpdateCampaign(resumeConfirmCampaign.id, { status: "Running" as Campaign["status"] });
                  toast.success(`"${resumeConfirmCampaign.name}" has been resumed`);
                }
                setResumeConfirmCampaign(null);
                setResumeNote("");
              }}
            >
              Resume Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}