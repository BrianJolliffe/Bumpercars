import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MoreVertical, Star, X, ChevronLeft, ChevronRight, Info, MessageSquare, Sparkles, ArrowRight, FolderPlus, Check, ArrowUpDown, ArrowDown, ArrowUp, Pencil, Copy, Store, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog"; // forwardRef-compatible
import { FilterCustomizer, FilterRule } from "@/app/components/FilterCustomizer";
import { toast } from "sonner";
import { NotesDrawer, Note } from "@/app/components/NotesDrawer";
import { OptimizeDrawer } from "@/app/components/OptimizeDrawer";
import { AISummaryDialog } from "@/app/components/AISummaryDialog";
import { PacingPopover } from "@/app/components/PacingPopover";

export interface Campaign {
  id: string;
  name: string;
  category: string;
  status: "Draft" | "On Hold" | "Running" | "Rejected" | "Ended" | "Paused" | "Scheduled";
  destination: string;
  platform: "Meta" | "Google Search" | "Google PMAX" | "Pinterest";
  objective?: string;
  brandId?: string;
  adTypes?: string;
  mediaChannel?: string;
  targeting?: string[];
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
    targeting: string[];
    objective: string[];
    adTypes: string[];
    mediaPlan: string[];
  };
  onRemoveQuickFilter?: (category: string, value: string) => void;
  onClearAllFilters?: () => void;
  showDemoNames?: boolean;
}

function generateDemoName(campaignId: string): string {
  let hash = 0;
  for (let i = 0; i < campaignId.length; i++) {
    hash = ((hash << 5) - hash + campaignId.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  const pick = (arr: string[], offset: number) => arr[((abs >> offset) ^ (abs >> (offset + 4))) % arr.length];

  const prefixes = ["PSOC", "SMKT", "DGTL", "PRFM", "BRND", "RTGT", "ACQN", "CMPN"];
  const cats = ["RM", "EL", "PL", "HW", "AP", "PT", "KT", "LN"];
  const sub = ["RMP", "SPA", "FLR", "LGT", "DRL", "SNK", "OVN", "VNT"];
  const goals = ["FBI", "AWR", "CNV", "TRF", "RET", "ENG", "VID", "DSP"];
  const periods = ["D25P", "W26Q", "M25H", "Q26A", "S25F", "A26W"];
  const channels = ["Multi", "Srch", "Disp", "Shop", "Video", "Socl"];
  const brands = ["DEWALT", "RYOBI", "MAKITA", "HUSKY", "RIGID", "BEHR", "DELTA", "KWSET"];
  const types = ["VNT", "CPC", "CPM", "CPA", "ROAS"];
  const flags = ["TRF", "ACQ", "RET", "BRD", "PRF"];
  const seasons = [
    "SpringOPE_ProTradesProjectsPP", "SummerOutdoor_PatioLiving",
    "FallRenovation_KitchenBath", "WinterHoliday_GiftGuide",
    "SpringCleaning_StorageOrg", "BackToSchool_SmartHome",
    "LaborDay_ApplianceEvent", "MemorialDay_OutdoorPower"
  ];
  const suffixes = ["MP", "SP", "DP", "LP", "HP"];

  const numId1 = (abs % 9000000 + 1000000).toString();
  const numId2 = (((abs >> 8) % 900000) + 100000).toString();
  const numId3 = ((abs >> 4) % 9000 + 1000).toString();
  const fy = `FY${25 + (abs % 3)}`;
  const code = `FR${25 + (abs % 3)}${String.fromCharCode(65 + (abs % 6))}${abs % 999}${String.fromCharCode(65 + ((abs >> 3) % 4))}${abs % 10}GP`;

  return [
    pick(prefixes, 0), pick(cats, 3), pick(sub, 5), pick(goals, 7),
    pick(periods, 9), pick(channels, 11), "NA",
    pick(brands, 13), "NA", pick(types, 15),
    numId1, "NA", pick(flags, 17), fy, code,
    numId2, numId3,
    `${pick(seasons, 19)}_${pick(suffixes, 21)}_${((abs >> 6) % 90000000 + 10000000).toString()}`
  ].join("-");
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
  showDemoNames,
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
  const [editingCell, setEditingCell] = useState<{ campaignId: string; field: "endDate" | "budget" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editBudgetFrequency, setEditBudgetFrequency] = useState("Lifetime");
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [selectedCampaignForNotes, setSelectedCampaignForNotes] = useState<string | null>(null);
  const [campaignNotes, setCampaignNotes] = useState<Record<string, Note[]>>({
    "113602": [
      {
        id: "note-1",
        title: "Creative refresh needed",
        content: "The current ad creative is showing signs of fatigue. We should test new messaging focused on winter safety features. Consider using customer testimonials in the next iteration.",
        tags: ["Creative", "Testing", "Winter"],
        visibility: "Everyone",
        date: "Feb 3, 2026 at 2:30 pm",
        createdBy: "Sarah Chen"
      },
      {
        id: "note-2",
        title: "Budget adjustment recommendation",
        content: "Pacing at 90% suggests we may underspend. Recommend increasing daily budget by 15% to hit monthly goals. Need approval from Sarah before making changes.",
        tags: ["Budget", "Pacing"],
        visibility: "Associates Only",
        date: "Feb 5, 2026 at 9:15 am",
        createdBy: "Michael Torres"
      },
      {
        id: "note-3",
        title: "Audience insights",
        content: "Analysis shows strong engagement from 35-44 age group. Performance is weaker with younger demographics. Consider creating separate campaign for 18-24 segment with different messaging.",
        tags: ["Audience", "Performance", "Analysis"],
        visibility: "Me Only",
        date: "Feb 1, 2026 at 4:20 pm",
        createdBy: "Alex Johnson"
      }
    ],
    "113601": [
      {
        id: "note-4",
        title: "Flash sale performing well",
        content: "ROAS at 3.1x exceeding target of 2.5x. Strong conversion rate on mobile devices. Desktop traffic underperforming - might need bid adjustments for desktop placements.",
        tags: ["Performance", "Flash Sale", "Mobile"],
        visibility: "Everyone",
        date: "Feb 4, 2026 at 11:45 am",
        createdBy: "Emily Park"
      },
      {
        id: "note-5",
        title: "Competitor analysis",
        content: "Noticed competitor running similar promotion. They're offering free shipping which we're not. Recommend adding shipping incentive to maintain competitive edge.",
        tags: ["Competitive", "Strategy"],
        visibility: "Associates Only",
        date: "Jan 28, 2026 at 3:10 pm",
        createdBy: "James Rodriguez"
      }
    ],
    "113603": [
      {
        id: "note-6",
        title: "Over-pacing alert",
        content: "Campaign is pacing at 102% — slightly over budget. We should monitor daily spend and consider reducing bids on lower-performing ad groups to bring pacing back in line before end of flight.",
        tags: ["Pacing", "Budget"],
        visibility: "Everyone",
        date: "Feb 6, 2026 at 10:20 am",
        createdBy: "Sarah Chen"
      },
      {
        id: "note-7",
        title: "Top product performers identified",
        content: "Spring lawn mower set and outdoor furniture bundles driving 65% of conversions. Recommend shifting more budget to these product groups and pausing underperforming SKUs.",
        tags: ["Products", "Optimization"],
        visibility: "Associates Only",
        date: "Feb 4, 2026 at 1:45 pm",
        createdBy: "Michael Torres"
      }
    ],
    "113604": [
      {
        id: "note-8",
        title: "Video completion rates strong",
        content: "Pinterest promoted pins showing 72% engagement rate, well above the 55% benchmark. Consider extending the campaign flight and allocating additional budget from underperforming channels.",
        tags: ["Visual", "Pinterest", "Performance"],
        visibility: "Everyone",
        date: "Feb 5, 2026 at 4:30 pm",
        createdBy: "Emily Park"
      },
      {
        id: "note-9",
        title: "Brand lift study results",
        content: "Preliminary brand lift study shows 12% increase in unaided brand recall among exposed users. Ad recall is up 18%. Full report expected by end of week from the research team.",
        tags: ["Brand Lift", "Research"],
        visibility: "Associates Only",
        date: "Feb 3, 2026 at 11:00 am",
        createdBy: "Lisa Wang"
      }
    ],
    "113605": [
      {
        id: "note-10",
        title: "Gift bundle creative outperforming",
        content: "The 'Perfect Gift' carousel ad is generating 2.3x higher CTR than the standard product shots. Recommend making this the primary creative for the remaining flight days leading up to Feb 14.",
        tags: ["Creative", "Valentine's Day"],
        visibility: "Everyone",
        date: "Feb 8, 2026 at 9:00 am",
        createdBy: "Alex Johnson"
      },
      {
        id: "note-11",
        title: "Audience expansion opportunity",
        content: "Lookalike audience based on past Valentine's purchasers is showing strong early signals. CPA is 22% lower than core targeting. Recommend increasing budget allocation to this segment.",
        tags: ["Audience", "Targeting"],
        visibility: "Me Only",
        date: "Feb 6, 2026 at 2:15 pm",
        createdBy: "James Rodriguez"
      }
    ],
    "113606": [
      {
        id: "note-12",
        title: "Launch week performance review",
        content: "New cordless drill line generating strong search volume. Branded search CTR at 4.8% and non-branded at 0.32%. Need to increase bids on competitor keyword groups to capture more share of voice.",
        tags: ["Launch", "Search", "Bids"],
        visibility: "Everyone",
        date: "Jan 20, 2026 at 3:45 pm",
        createdBy: "Michael Torres"
      },
      {
        id: "note-13",
        title: "Landing page bounce rate concern",
        content: "Product page bounce rate is at 68% on mobile — significantly higher than the 45% desktop rate. UX team has been notified. May need a mobile-optimized landing page before we scale spend.",
        tags: ["UX", "Mobile", "Landing Page"],
        visibility: "Associates Only",
        date: "Jan 18, 2026 at 10:30 am",
        createdBy: "Sarah Chen"
      }
    ],
    "113607": [
      {
        id: "note-14",
        title: "Install cost trending down",
        content: "Cost per install has dropped from $4.20 to $3.15 over the past week after creative refresh. Continue monitoring — if trend holds, we can request additional budget to scale installs before flight end.",
        tags: ["CPI", "Mobile App", "Optimization"],
        visibility: "Everyone",
        date: "Jan 25, 2026 at 11:30 am",
        createdBy: "Emily Park"
      },
      {
        id: "note-15",
        title: "Day 7 retention data",
        content: "Users acquired through Pinterest ads showing 28% D7 retention vs 19% from other channels. Quality of installs from this campaign is above average. Worth discussing budget reallocation with the growth team.",
        tags: ["Retention", "Analytics"],
        visibility: "Me Only",
        date: "Jan 22, 2026 at 4:00 pm",
        createdBy: "Lisa Wang"
      }
    ],
    "113608": [
      {
        id: "note-16",
        title: "PMAX asset group performance",
        content: "Asset group 'Winter Jackets' outperforming all others with 3.1x ROAS vs campaign average of 2.2x. 'Snow Equipment' group underperforming at 1.4x — consider pausing and reallocating budget.",
        tags: ["PMAX", "Asset Groups", "Performance"],
        visibility: "Everyone",
        date: "Jan 30, 2026 at 2:00 pm",
        createdBy: "Alex Johnson"
      },
      {
        id: "note-17",
        title: "Inventory sync issue flagged",
        content: "Three products in the feed are showing as out of stock but still receiving clicks. Submitted ticket to the merchandising team to update the product feed. Should be resolved within 24 hours.",
        tags: ["Feed", "Inventory", "Issue"],
        visibility: "Associates Only",
        date: "Jan 28, 2026 at 9:20 am",
        createdBy: "James Rodriguez"
      }
    ],
    "113609": [
      {
        id: "note-18",
        title: "B2B targeting refinements",
        content: "Narrowed targeting to job titles including 'General Contractor', 'Site Manager', and 'Construction Foreman'. Early results show 40% improvement in lead quality. CPL is higher but conversion to purchase is much stronger.",
        tags: ["B2B", "Targeting", "Contractors"],
        visibility: "Everyone",
        date: "Feb 1, 2026 at 10:15 am",
        createdBy: "Michael Torres"
      },
      {
        id: "note-19",
        title: "Bundle pricing feedback",
        content: "Sales team reports positive feedback on the contractor bundle pricing. Several large accounts have placed repeat orders attributed to this campaign. Consider creating a case study for future campaigns.",
        tags: ["Sales", "Feedback"],
        visibility: "Associates Only",
        date: "Jan 28, 2026 at 3:30 pm",
        createdBy: "Sarah Chen"
      }
    ],
    "113610": [
      {
        id: "note-20",
        title: "Content series performing well",
        content: "The 'Weekend Project' video series is generating strong engagement — average watch time of 4.2 minutes on 6-minute videos. Comment sentiment is overwhelmingly positive. Plan to produce 4 more episodes.",
        tags: ["Content", "Video", "Engagement"],
        visibility: "Everyone",
        date: "Feb 2, 2026 at 1:30 pm",
        createdBy: "Lisa Wang"
      },
      {
        id: "note-21",
        title: "Influencer partnership opportunity",
        content: "DIY influencer @HomeFixHero (850K subscribers) reached out about a sponsored collaboration. Their audience aligns perfectly with our target demo. Sent details to the partnerships team for review.",
        tags: ["Influencer", "Partnership"],
        visibility: "Me Only",
        date: "Jan 20, 2026 at 11:45 am",
        createdBy: "Alex Johnson"
      },
      {
        id: "note-22",
        title: "Seasonal keyword expansion",
        content: "Added 35 new long-tail keywords around 'spring home improvement' and 'DIY renovation ideas'. Search volume is picking up as we approach March. Expect CTR to improve as seasonal intent increases.",
        tags: ["Keywords", "SEO", "Seasonal"],
        visibility: "Associates Only",
        date: "Jan 15, 2026 at 5:00 pm",
        createdBy: "Emily Park"
      }
    ]
  });
  const [optimizeDrawerOpen, setOptimizeDrawerOpen] = useState(false);
  const [selectedCampaignForOptimize, setSelectedCampaignForOptimize] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const campaignsPerPage = 10;
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
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummaryCampaignId, setAiSummaryCampaignId] = useState<string | null>(null);

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

  // Column presets
  const columnPresets = {
    essential: ["id", "name", "status", "budget", "spend", "pacing", "roas"],
    performance: ["id", "name", "status", "spend", "budgetSpent", "pacing", "ctr", "roas"],
    timeline: ["id", "name", "status", "startDate", "endDate", "flightCompleted", "budget", "spend"]
  };

  const applyColumnPreset = (preset: keyof typeof columnPresets) => {
    setVisibleColumns(columnPresets[preset]);
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
    roas: 52, lastModified: 75, mediaPlan: 100,
  };
  const alwaysVisibleWidth = 64 + 28 + 160 + 68 + 40; // toggle + star + optimizations + notes + actions
  const dynamicColumnsWidth = visibleColumns.reduce((sum, col) => sum + (columnWidthMap[col] || 100), 0);
  const tableMinWidth = alwaysVisibleWidth + dynamicColumnsWidth;

  // Pinned column widths for scrollbar positioning
  const leftPinnedWidth = 64 + 28 + (isColumnVisible("id") ? 60 : 0) + (isColumnVisible("name") ? 200 : 0);
  const rightPinnedWidth = 160 + 68 + 40; // optimizations + notes + actions

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

  const handleOpenNotes = (campaignId: string) => {
    setSelectedCampaignForNotes(campaignId);
    setNotesDrawerOpen(true);
    setCampaignMenuOpen(null);
  };

  const handleAddNote = (campaignId: string, noteData: Omit<Note, "id" | "date" | "createdBy">) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ' at ' + now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }).toLowerCase();
    
    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}`,
      date: formattedDate,
      createdBy: "Current User", // In a real app, this would come from the authenticated user
    };

    setCampaignNotes(prev => ({
      ...prev,
      [campaignId]: [newNote, ...(prev[campaignId] || [])],
    }));

    toast.success("Note added successfully", {
      closeButton: true,
    });
  };

  const handleOpenOptimize = (campaignId: string) => {
    setSelectedCampaignForOptimize(campaignId);
    setOptimizeDrawerOpen(true);
    setCampaignMenuOpen(null);
  };

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
    const type = columnSortType[sortColumn] || "text";
    const dir = sortDirection === "asc" ? 1 : -1;

    let aVal: any;
    let bVal: any;

    if (sortColumn === "starred" && starredSnapshotForSort) {
      aVal = starredSnapshotForSort.has(a.id) ? 1 : 0;
      bVal = starredSnapshotForSort.has(b.id) ? 1 : 0;
      return (aVal - bVal) * dir;
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
          case "sales": return parseNumericStr(c.sales);
          case "roas": return parseNumericStr(c.roas);
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
  }), [campaigns, sortColumn, sortDirection, starredSnapshotForSort]);

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
      targeting: "Targeting",
      mediaPlan: "Media Plan",
      flightCompleted: "% Flight Completed",
      budget: "Budget",
      impressions: "Impressions",
      ctc: "CTC",
      cpr: "CPR",
      roas: "ROAS",
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

  // Render optimization chips
  const renderOptimizationChips = (campaign: Campaign) => {
    // Paused and Draft campaigns show no optimizations
    if (campaign.status === "Paused" || campaign.status === "Draft") {
      return null;
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
        // Campaign Optimized or other status
        return (
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
            <Check className="w-3.5 h-3.5" />
            Campaign Optimized
          </div>
        );
      }
    }
    
    return null;
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
              <span className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight" title={showDemoNames ? generateDemoName(campaign.id) : campaign.name}>{showDemoNames ? generateDemoName(campaign.id) : campaign.name}</span>
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
          <Popover 
            open={editingCell?.campaignId === campaign.id && editingCell?.field === "endDate"} 
            onOpenChange={(open) => {
              if (!open) setEditingCell(null);
            }}
          >
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1 group/edit">
                <span>{campaign.endDate}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const parsed = new Date(campaign.endDate);
                    const isoDate = !isNaN(parsed.getTime()) ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` : "";
                    setEditValue(isoDate);
                    setEditingCell({ campaignId: campaign.id, field: "endDate" });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 cursor-pointer"
                  title="Edit end date"
                >
                  <Pencil className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="bottom" align="start">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-gray-900">Edit End Date</div>
                <input
                  type="date"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318]"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setEditingCell(null)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editValue && onUpdateCampaign) {
                        const d = new Date(editValue + "T00:00:00");
                        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        const formatted = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                        onUpdateCampaign(campaign.id, { endDate: formatted });
                        toast.success(`End date updated to ${formatted}`);
                      }
                      setEditingCell(null);
                    }}
                    className="px-3 py-1.5 text-xs text-white bg-[#f26318] hover:bg-[#d9550f] rounded-md cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </td>}
        {isColumnVisible("pacing") && <td className="px-2 py-2 w-[100px] whitespace-nowrap">
          <PacingPopover campaign={campaign} health={health}>
            <span className="group/pacing inline-flex items-center gap-1 cursor-pointer transition-all [&:hover_span]:font-[600]">
              <span className="transition-all inline-flex items-center gap-0.5">{getPacingIndicator(campaign.pacing, health, campaign)}<TrendArrow value={campaign.benchmarks?.pacing?.wow} /></span>
              <svg className="w-3 h-3 text-muted-foreground group-hover/pacing:text-primary transition-colors shrink-0" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </PacingPopover>
        </td>}
        {isColumnVisible("spend") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          ${campaign.spend.toLocaleString()}
        </td>}
        {isColumnVisible("budget") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          <Popover 
            open={editingCell?.campaignId === campaign.id && editingCell?.field === "budget"} 
            onOpenChange={(open) => {
              if (!open) setEditingCell(null);
            }}
          >
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1 group/edit">
                <span>${campaign.budget.toLocaleString()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditValue(String(campaign.budget));
                    setEditBudgetFrequency("Lifetime");
                    setEditingCell({ campaignId: campaign.id, field: "budget" });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 cursor-pointer"
                  title="Edit budget"
                >
                  <Pencil className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="bottom" align="start">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-gray-900">Edit Budget</div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500">Amount</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      min={0}
                      step={100}
                      className="w-full pl-6 pr-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500">Budget Frequency</label>
                  <select
                    value={editBudgetFrequency}
                    onChange={(e) => setEditBudgetFrequency(e.target.value)}
                    className="w-full pl-2.5 pr-12 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318] cursor-pointer"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Lifetime">Lifetime</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setEditingCell(null)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const num = parseFloat(editValue);
                      if (!isNaN(num) && num >= 0 && onUpdateCampaign) {
                        onUpdateCampaign(campaign.id, { budget: num });
                        toast.success(`Budget updated to $${num.toLocaleString()} (${editBudgetFrequency})`);
                      }
                      setEditingCell(null);
                    }}
                    className="px-3 py-1.5 text-xs text-white bg-[#f26318] hover:bg-[#d9550f] rounded-md cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </td>}
        {isColumnVisible("roas") && <td className="px-2 py-2 w-[52px] text-sm text-gray-900 whitespace-nowrap">
          <span className="inline-flex items-center gap-0.5">{campaign.roas}<TrendArrow value={campaign.benchmarks?.roas?.wow} /></span>
        </td>}
        {isColumnVisible("ctr") && <td className="px-2 py-2 w-[48px] text-sm text-gray-900 whitespace-nowrap">
          <span className="inline-flex items-center gap-0.5">{campaign.ctr}<TrendArrow value={campaign.benchmarks?.ctr?.wow} /></span>
        </td>}
        {isColumnVisible("lastModified") && <td className="px-2 py-2 w-[75px] text-sm text-gray-500">
          <span className="leading-tight">{campaign.lastModified || "N/A"}</span>
        </td>}
        {isColumnVisible("brandId") && <td className="px-2 py-2 w-[80px]">
          <div className="text-sm text-gray-900">{campaign.brandId || '-'}</div>
        </td>}
        {isColumnVisible("objective") && <td className="px-2 py-2 w-[110px] text-sm text-gray-900 whitespace-nowrap">{campaign.objective || "-"}</td>}
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
        {isColumnVisible("sales") && <td className="px-2 py-2 w-[78px] text-sm text-gray-900 whitespace-nowrap">
          {campaign.sales}
        </td>}
        {isColumnVisible("mediaPlan") && <td className="px-2 py-2 w-[100px] text-sm text-gray-900 whitespace-nowrap">
          {campaign.mediaPlan || '-'}
        </td>}
        <td 
          className={`pinned-edge-left sticky right-[108px] z-20 ${rowBg} group-hover:${hoverBgColor} pl-3 pr-2 py-2 w-[160px] min-w-[160px]`}
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
        </td>
        <td 
          className={`sticky right-[40px] z-20 ${rowBg} group-hover:${hoverBgColor} px-2 py-2 w-[68px] min-w-[68px]`}
          style={{
            boxShadow: `-1px 0 0 0 ${bgHex}, 1px 0 0 0 ${bgHex}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `-1px 0 0 0 ${hoverHex}, 1px 0 0 0 ${hoverHex}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `-1px 0 0 0 ${bgHex}, 1px 0 0 0 ${bgHex}`;
          }}
        >
          {(campaignNotes[campaign.id]?.length || 0) > 0 ? (
            <button
              onClick={() => handleOpenNotes(campaign.id)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{campaignNotes[campaign.id].length}</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenNotes(campaign.id)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>0</span>
            </button>
          )}
        </td>
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
              <button
                onClick={() => setCampaignMenuOpen(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Duplicate</span>
              </button>
              <button
                onClick={() => setCampaignMenuOpen(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors"
              >
                <Store className="w-4 h-4" />
                <span>Duplicate to Another Store</span>
              </button>
              <div className="my-1 border-t border-gray-200" />
              <button
                onClick={() => setCampaignMenuOpen(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
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



      {/* Filter Chips Row - Outside scroll container */}
      {(selectedStatuses.length > 0 || selectedAdTypes.length > 0 || selectedPacing.length > 0 || selectedObjectives.length > 0 || selectedBrandIds.length > 0 || appliedFilters.some(f => f.values.length > 0) || (quickFilters && (quickFilters.targeting.length > 0 || quickFilters.objective.length > 0 || quickFilters.adTypes.length > 0 || quickFilters.mediaPlan.length > 0))) && (
        <div className="border-b border-border bg-background px-4 py-3" style={{ fontFamily: 'var(--font-family-inter)' }}>
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground shrink-0" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>{displayCampaigns.length} Campaigns Matched</span>
              {selectedStatuses.map(status => (
                <div 
                  key={status}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span>Status: {status}</span>
                  <button
                    onClick={() => removeStatusFilter(status)}
                    className="hover:text-primary/80 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Quick filter pills: targeting */}
              {quickFilters?.targeting.map(v => (
                <div 
                  key={`qf-targeting-${v}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span>Targeting: {v}</span>
                  <button onClick={() => onRemoveQuickFilter?.("targeting", v)} className="hover:text-primary/80 cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {/* Quick filter pills: objective */}
              {quickFilters?.objective.map(v => (
                <div 
                  key={`qf-objective-${v}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span>Objective: {v}</span>
                  <button onClick={() => onRemoveQuickFilter?.("objective", v)} className="hover:text-primary/80 cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {/* Quick filter pills: adTypes */}
              {quickFilters?.adTypes.map(v => (
                <div 
                  key={`qf-adtype-${v}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span>Ad Type: {v}</span>
                  <button onClick={() => onRemoveQuickFilter?.("adTypes", v)} className="hover:text-primary/80 cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {/* Quick filter pills: mediaPlan */}
              {quickFilters?.mediaPlan.map(v => (
                <div 
                  key={`qf-media-${v}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span>Media Plan: {v}</span>
                  <button onClick={() => onRemoveQuickFilter?.("mediaPlan", v)} className="hover:text-primary/80 cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {selectedAdTypes.map(adType => (
                <div 
                  key={adType}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span className="text-foreground">Ad Type: {adType}</span>
                  <button onClick={() => removeAdTypeFilter(adType)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {selectedPacing.map(pacing => (
                <div 
                  key={pacing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span className="text-foreground">Pacing: {pacing}</span>
                  <button onClick={() => removePacingFilter(pacing)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {selectedObjectives.map(objective => (
                <div 
                  key={objective}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span className="text-foreground">Objective: {objective}</span>
                  <button onClick={() => removeObjectiveFilter(objective)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {selectedBrandIds.map(brandId => (
                <div 
                  key={brandId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span className="text-foreground">Brand: {brandId}</span>
                  <button onClick={() => removeBrandIdFilter(brandId)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {appliedFilters.filter(filter => filter.field !== 'status').map((filter) => filter.values.map((value) => (
                <div 
                  key={`${filter.id}-${value}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent shrink-0"
                  style={{ fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-chip)' }}
                >
                  <span>
                    {getFilterFieldLabel(filter.field)}: {filter.operator && filter.operator !== "is" ? `${filter.operator} ` : ""}{formatFilterValue(filter.field, value)}
                  </span>
                  <button onClick={() => removeAppliedFilter(filter.id)} className="hover:text-accent/80 cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              )))}
            </div>
            <button 
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}
              onClick={() => {
                setSearchQuery("");
                setSelectedStatuses([]);
                setSelectedAdTypes([]);
                setSelectedPacing([]);
                setSelectedObjectives([]);
                setSelectedBrandIds([]);
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
                  Destination
                  <SortIcon column="destination" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Destination</div>
                        <p className="text-gray-600">The landing page or URL where users are directed after clicking the ad. This is the target web page associated with the campaign's call to action.</p>
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
              {isColumnVisible("roas") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[52px]">
                <div className={`flex items-center gap-1 ${isSortActive("roas") ? "text-gray-900" : ""}`}>
                  <div>ROAS</div>
                  <SortIcon column="roas" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">ROAS (Return on Ad Spend)</div>
                        <p className="text-gray-600">Return on Ad Spend (ROAS). The revenue generated per dollar spent. For example, a value of 2.0x means $2 in attributed revenue for every $1 spent on the campaign.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
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
              {isColumnVisible("sales") && <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[78px]">
                <div className={`flex items-center gap-1 ${isSortActive("sales") ? "text-gray-900" : ""}`}>
                  <div>Sales</div>
                  <SortIcon column="sales" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Sales</div>
                        <p className="text-gray-600">Total revenue attributed to this campaign. This represents the sales value generated as a result of the campaign's ad interactions.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
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
              <th className="pinned-edge-left sticky right-[108px] top-0 z-30 bg-gray-50 pl-3 pr-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[160px] min-w-[160px]" style={{ boxShadow: '-10px 0 0 0 rgb(249,250,251)' }}>
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
              </th>
              <th className="sticky right-[40px] top-0 z-30 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[68px] min-w-[68px]" style={{ boxShadow: '-1px 0 0 0 rgb(249,250,251), 1px 0 0 0 rgb(249,250,251)' }}>
                <div className="flex items-center gap-1">
                  Notes
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Info className="w-3 h-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top">
                      <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-gray-900 mb-2">Notes</div>
                        <p className="text-gray-600">Internal notes and comments added to this campaign by team members. Click to view, add, or manage campaign notes.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>
              <th className="sticky right-0 top-0 z-30 bg-gray-50 px-2 py-2 w-[40px] min-w-[40px]" style={{ boxShadow: '-1px 0 0 0 rgb(249,250,251), 10px 0 0 0 rgb(249,250,251)' }}>
              </th>

            </tr>
          </thead>
          
          {/* Aggregation Row */}
          <tbody className="bg-gray-50">
            <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
              <td
                className="sticky left-0 z-10 bg-gray-50 pl-3 pr-1.5 py-2 text-sm text-gray-900 whitespace-nowrap"
                colSpan={1 + 1 + (isColumnVisible("id") ? 1 : 0) + (isColumnVisible("name") ? 1 : 0)}
                style={{ boxShadow: '10px 0 0 0 rgb(249,250,251)' }}
              >
                Total for {displayCampaigns.length.toLocaleString()} Campaigns
              </td>
              
              {isColumnVisible("status") && <td className="px-2 py-2"></td>}
              {isColumnVisible("destination") && <td className="px-2 py-2"></td>}
              {isColumnVisible("startDate") && <td className="px-2 py-2"></td>}
              {isColumnVisible("endDate") && <td className="px-2 py-2"></td>}
              
              {isColumnVisible("pacing") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.length > 0 
                    ? `${(displayCampaigns.reduce((sum, c) => sum + parseFloat(c.pacing.replace('%', '')), 0) / displayCampaigns.length).toFixed(1)}%`
                    : '-'
                  }
                </td>
              )}
              
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
              
              {isColumnVisible("roas") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.length > 0 
                    ? `${(displayCampaigns.reduce((sum, c) => sum + parseFloat(c.roas.replace('x', '')), 0) / displayCampaigns.length).toFixed(2)}x`
                    : '-'
                  }
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
              
              {isColumnVisible("lastModified") && <td className="px-2 py-2"></td>}
              {isColumnVisible("brandId") && <td className="px-2 py-2"></td>}
              {isColumnVisible("objective") && <td className="px-2 py-2"></td>}
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
              
              {isColumnVisible("sales") && (
                <td className="px-2 py-2 text-sm text-gray-900">
                  {displayCampaigns.filter(c => c.sales).length > 0 
                    ? `$${(displayCampaigns.filter(c => c.sales).reduce((sum, c) => sum + parseFloat(c.sales!.replace(/[$M]/g, '')), 0)).toFixed(1)}M`
                    : '-'
                  }
                </td>
              )}
              
              {isColumnVisible("mediaPlan") && <td className="px-2 py-2"></td>}
              <td className="pinned-edge-left sticky right-[108px] z-10 bg-gray-50 pl-3 pr-2 py-2 w-[160px] min-w-[160px]" style={{ boxShadow: '-10px 0 0 0 rgb(249,250,251)' }}></td>
              <td className="sticky right-[40px] z-10 bg-gray-50 px-2 py-2 w-[68px] min-w-[68px]" style={{ boxShadow: '-1px 0 0 0 rgb(249,250,251), 1px 0 0 0 rgb(249,250,251)' }}></td>
              <td className="sticky right-0 z-10 bg-gray-50 px-2 py-2 w-[40px] min-w-[40px]" style={{ boxShadow: '-1px 0 0 0 rgb(249,250,251)' }}></td>
            </tr>
          </tbody>
          
          <tbody className="divide-y divide-gray-200">
            {paginatedCampaigns.map((campaign) => renderCampaignRow(campaign, false))}
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
      <div className="flex items-center justify-end px-4 py-3 bg-gray-50 border-t border-gray-200 shrink-0">
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

      {/* Notes Drawer */}
      {selectedCampaignForNotes && (
        <NotesDrawer
          isOpen={notesDrawerOpen}
          onClose={() => {
            setNotesDrawerOpen(false);
            setSelectedCampaignForNotes(null);
          }}
          campaignId={selectedCampaignForNotes}
          campaignName={campaigns.find(c => c.id === selectedCampaignForNotes)?.name || ""}
          notes={campaignNotes[selectedCampaignForNotes] || []}
          onAddNote={(noteData) => handleAddNote(selectedCampaignForNotes, noteData)}
        />
      )}

      {/* Optimize Drawer */}
      {selectedCampaignForOptimize && (
        <OptimizeDrawer
          isOpen={optimizeDrawerOpen}
          onClose={() => {
            setOptimizeDrawerOpen(false);
            setSelectedCampaignForOptimize(null);
          }}
          campaign={campaigns.find(c => c.id === selectedCampaignForOptimize)!}
        />
      )}

      {/* AI Summary Dialog - hidden */}

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