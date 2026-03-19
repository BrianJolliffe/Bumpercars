import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Bell, Search, Filter, X, ChevronDown, Plus, Settings, SlidersHorizontal, MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react";
import dewaltLogo from "figma:asset/c83d6fbce686d39b965bc80ee00d9d9f4682c202.png";
import orangeAccessLogo from "figma:asset/d08116febc01d4a3e0d1507492e9a1206eb7ca8b.png";
import { CampaignsTable, Campaign } from "@/app/components/CampaignsTable";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DraggableTab } from "@/app/components/DraggableTab";
import { DateRangePicker } from "@/app/components/DateRangePicker";
import { ExportSelector } from "@/app/components/ExportSelector";
import { FilterCustomizer, FilterRule } from "@/app/components/FilterCustomizer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/app/components/ui/dropdown-menu";
import { CriticalCampaignsDrawer } from "@/app/components/CriticalCampaignsDrawer";
import { Toaster } from "@/app/components/ui/sonner";
import { CampaignSummaryCards } from "@/app/components/CampaignSummaryCards";
import { ViewEditorDrawer } from "@/app/components/ViewEditorDrawer";
import { FieldsDrawer } from "@/app/components/FieldsDrawer";
import { LoginGate } from "@/app/components/LoginGate";
import { Switch } from "@/app/components/ui/switch";

interface Column {
  id: string;
  label: string;
  category: string;
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [monitoringView, setMonitoringView] = useState("Monitoring View");
  const [dateRange, setDateRange] = useState("Last 7 Days: Jan 27, 2026 – Feb 2, 2026");
  const [customViews, setCustomViews] = useState<string[]>([]);
  const [activeViewFilter, setActiveViewFilter] = useState("running");
  const [starredCampaignIds, setStarredCampaignIds] = useState<Set<string>>(new Set());
  const [showDemoNames, setShowDemoNames] = useState(false);

  const [showCreateViewDrawer, setShowCreateViewDrawer] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const [isEditingView, setIsEditingView] = useState(false);
  const [editingViewName, setEditingViewName] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showColumnDrawer, setShowColumnDrawer] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterRule[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterRule[]>([]);
  // Quick filter state
  const [showQuickFilter, setShowQuickFilter] = useState(false);
  const [quickFilterStatus, setQuickFilterStatus] = useState<string[]>([]);
  const [quickFilterTargeting, setQuickFilterTargeting] = useState<string[]>([]);
  const [quickFilterObjective, setQuickFilterObjective] = useState<string[]>([]);
  const [quickFilterAdTypes, setQuickFilterAdTypes] = useState<string[]>([]);
  const [quickFilterMediaPlan, setQuickFilterMediaPlan] = useState<string[]>([]);


  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [showCriticalDrawer, setShowCriticalDrawer] = useState(false);
  const [showAllIssuesDrawer, setShowAllIssuesDrawer] = useState(false);
  
  // Tab order state - default tabs + custom views
  const [tabOrder, setTabOrder] = useState<string[]>(["running", "attention", "draft"]);
  const [defaultViewId, setDefaultViewId] = useState<string>("running");

  // Dynamically add/remove watchlist tab when starred campaigns change
  useEffect(() => {
    if (starredCampaignIds.size > 0 && !tabOrder.includes("watchlist")) {
      setTabOrder(prev => [...prev, "watchlist"]);
    } else if (starredCampaignIds.size === 0 && tabOrder.includes("watchlist")) {
      setTabOrder(prev => prev.filter(t => t !== "watchlist"));
      if (activeViewFilter === "watchlist") {
        setActiveViewFilter("running");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starredCampaignIds]);

  // Create View drawer - filter management
  const [viewFilterRows, setViewFilterRows] = useState<FilterRule[]>([]);

  // Create View drawer - column management
  const [viewSelectedColumns, setViewSelectedColumns] = useState<string[]>([]);

  // Track if current view has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFilters, setInitialFilters] = useState<FilterRule[]>(appliedFilters);
  
  // Default visible columns
  const defaultVisibleColumns = [
    "name", "id", "status", "destination", "startDate", "endDate", "pacing", 
    "spend", "budget", "roas", "ctr", "lastModified"
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);
  const [initialVisibleColumns, setInitialVisibleColumns] = useState<string[]>(defaultVisibleColumns);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>("lastModified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Edit view drawer sort state
  const [editViewSortColumn, setEditViewSortColumn] = useState<string>("lastModified");
  const [editViewSortDirection, setEditViewSortDirection] = useState<"asc" | "desc">("desc");

  // Initial tracking for change detection
  const [initialSortColumn, setInitialSortColumn] = useState<string>("lastModified");
  const [initialSortDirection, setInitialSortDirection] = useState<"asc" | "desc">("desc");
  const [initialDateRange, setInitialDateRange] = useState<string>(dateRange);
  const [initialQuickFilters, setInitialQuickFilters] = useState<{
    status: string[]; targeting: string[]; objective: string[]; adTypes: string[]; mediaPlan: string[];
  }>({ status: [], targeting: [], objective: [], adTypes: [], mediaPlan: [] });

  // Store view-specific configurations
  const [viewConfigurations, setViewConfigurations] = useState<Record<string, {
    filters: FilterRule[];
    columns: string[];
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    quickFilters?: {
      status?: string[];
      targeting?: string[];
      objective?: string[];
      adTypes?: string[];
      mediaPlan?: string[];
    };
  }>>({
    "running": {
      filters: [],
      quickFilters: {},
      columns: ["name", "id", "status", "destination", "startDate", "endDate", "pacing", "spend", "budget", "roas", "ctr", "lastModified"]
    },
    "draft": {
      filters: [],
      quickFilters: { status: ["Draft"] },
      columns: ["name", "id", "status", "destination", "startDate", "endDate", "budget", "lastModified"]
    },
    "ending7d": {
      filters: [
        { id: "filter-endDate-ending7d", field: "endDate", operator: "is on or before", values: [(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })()] }
      ],
      quickFilters: { status: ["Running", "Paused"] },
      columns: ["name", "id", "status", "destination", "startDate", "endDate", "pacing", "spend", "budget", "roas", "ctr", "lastModified"]
    },
    "attention": {
      filters: [
        { id: "filter-pacing-attention", field: "pacing", operator: "less than", values: ["Under 80%"] },
        { id: "filter-roas-attention", field: "roas", operator: "less than", values: ["Less than 1.5"] },
        { id: "filter-ctr-attention", field: "ctr", operator: "less than", values: ["Less than 0.3%"] }
      ],
      quickFilters: { status: ["Running", "Paused"] },
      columns: ["name", "id", "status", "destination", "startDate", "endDate", "pacing", "spend", "budget", "roas", "ctr", "lastModified"]
    },
    "watchlist": {
      filters: [],
      columns: ["name", "id", "status", "destination", "startDate", "endDate", "pacing", "spend", "budget", "roas", "ctr", "lastModified"]
    }
  });

  const statusOptions = ["Draft", "On Hold", "Running", "Rejected", "Ended", "Paused", "Scheduled"];

  // Restore view configuration when switching views
  useEffect(() => {
    const viewConfig = viewConfigurations[activeViewFilter];
    if (viewConfig) {
      setAppliedFilters(viewConfig.filters);
      setVisibleColumns(viewConfig.columns);
      setInitialFilters(viewConfig.filters);
      setInitialVisibleColumns(viewConfig.columns);
      // Restore saved sort or default to Last Modified desc
      const sc = viewConfig.sortColumn || "lastModified";
      const sd = viewConfig.sortDirection || "desc";
      setSortColumn(sc);
      setSortDirection(sd);
      setInitialSortColumn(sc);
      setInitialSortDirection(sd);
      // Sync selectedStatuses from view config's quick filters
      const qf = viewConfig.quickFilters || {};
      setSelectedStatuses(qf.status && qf.status.length > 0 ? [...qf.status] : []);
      // Sync quick filters from view config
      const qs = qf.status || [];
      const qt = qf.targeting || [];
      const qo = qf.objective || [];
      const qa = qf.adTypes || [];
      const qm = qf.mediaPlan || [];
      setQuickFilterStatus(qs);
      setQuickFilterTargeting(qt);
      setQuickFilterObjective(qo);
      setQuickFilterAdTypes(qa);
      setQuickFilterMediaPlan(qm);
      setInitialQuickFilters({ status: qs, targeting: qt, objective: qo, adTypes: qa, mediaPlan: qm });
    } else {
      // No config for this view — default sort
      setSortColumn("lastModified");
      setSortDirection("desc");
      setInitialSortColumn("lastModified");
      setInitialSortDirection("desc");
      setSelectedStatuses([]);
      // Clear quick filters
      setQuickFilterStatus([]);
      setQuickFilterTargeting([]);
      setQuickFilterObjective([]);
      setQuickFilterAdTypes([]);
      setQuickFilterMediaPlan([]);
      setInitialQuickFilters({ status: [], targeting: [], objective: [], adTypes: [], mediaPlan: [] });
    }
    setInitialDateRange(dateRange);
    setHasUnsavedChanges(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewFilter]);

  // Track changes to filters, columns, sort, date range, and quick filters
  useEffect(() => {
    const filtersChanged = JSON.stringify(appliedFilters) !== JSON.stringify(initialFilters);
    const columnsChanged = JSON.stringify([...visibleColumns].sort()) !== JSON.stringify([...initialVisibleColumns].sort());
    const sortChanged = sortColumn !== initialSortColumn || sortDirection !== initialSortDirection;
    const dateChanged = dateRange !== initialDateRange;
    const qfChanged =
      JSON.stringify(quickFilterStatus) !== JSON.stringify(initialQuickFilters.status) ||
      JSON.stringify(quickFilterTargeting) !== JSON.stringify(initialQuickFilters.targeting) ||
      JSON.stringify(quickFilterObjective) !== JSON.stringify(initialQuickFilters.objective) ||
      JSON.stringify(quickFilterAdTypes) !== JSON.stringify(initialQuickFilters.adTypes) ||
      JSON.stringify(quickFilterMediaPlan) !== JSON.stringify(initialQuickFilters.mediaPlan);
    setHasUnsavedChanges(filtersChanged || columnsChanged || sortChanged || dateChanged || qfChanged);
  }, [appliedFilters, visibleColumns, initialFilters, initialVisibleColumns, sortColumn, sortDirection, initialSortColumn, initialSortDirection, dateRange, initialDateRange, quickFilterStatus, quickFilterTargeting, quickFilterObjective, quickFilterAdTypes, quickFilterMediaPlan, initialQuickFilters]);

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  // Filter helper functions for Create View drawer
  const filterFieldLabels: Record<string, string> = {
    // Campaign Setup
    name: "Name",
    id: "ID",
    status: "Status",
    objective: "Objective",
    adTypes: "Ad Types",
    startDate: "Start Date",
    endDate: "End Date",
    mediaPlan: "Media Plan",
    lastModified: "Last Modified",
    mediaChannel: "Media Channel",
    targeting: "Targeting",
    // Budget & Pacing
    flightCompleted: "% Flight Completed",
    pacing: "Pacing",
    budget: "Budget",
    spend: "Spend",
    budgetSpent: "% Budget Spent",
    remainingBudget: "Remaining Budget",
    // Performance
    ctr: "CTR",
    cpc: "CPC",
    cpm: "CPM",
    conversionRate: "Conversion Rate",
    sales: "Sales",
    roas: "ROAS",
  };

  const fieldOperators: Record<string, string[]> = {
    // Text fields
    name: ["is", "is not"],
    id: ["is", "is not"],
    mediaPlan: ["is", "is not"],
    // Dropdown/status fields
    status: ["is", "is not"],
    objective: ["is", "is not"],
    adTypes: ["is", "is not"],
    mediaChannel: ["is", "is not"],
    targeting: ["contains", "does not contain"],
    // Date fields
    startDate: ["is on", "is on or before", "is on or after"],
    endDate: ["is on", "is on or before", "is on or after"],
    lastModified: ["is on", "is on or before", "is on or after"],
    // Numeric fields
    flightCompleted: ["is greater than", "is less than", "is equal to"],
    budget: ["is greater than", "is less than", "is equal to"],
    spend: ["is greater than", "is less than", "is equal to"],
    budgetSpent: ["is greater than", "is less than", "is equal to"],
    remainingBudget: ["is greater than", "is less than", "is equal to"],
    ctr: ["is greater than", "is less than", "is equal to"],
    cpc: ["is greater than", "is less than", "is equal to"],
    cpm: ["is greater than", "is less than", "is equal to"],
    conversionRate: ["is greater than", "is less than", "is equal to"],
    sales: ["is greater than", "is less than", "is equal to"],
    roas: ["is greater than", "is less than", "is equal to"],
    // Pacing can be both dropdown and numeric
    pacing: ["is", "is not", "is greater than", "is less than"],
  };

  type InputType = "text" | "dropdown" | "date";

  const fieldInputTypes: Record<string, InputType> = {
    name: "text",
    id: "text",
    mediaPlan: "text",
    status: "dropdown",
    objective: "dropdown",
    adTypes: "dropdown",
    mediaChannel: "dropdown",
    targeting: "dropdown",
    pacing: "dropdown",
    // Date fields use date picker
    startDate: "date",
    endDate: "date",
    lastModified: "date",
    flightCompleted: "text",
    budget: "text",
    spend: "text",
    budgetSpent: "text",
    remainingBudget: "text",
    ctr: "text",
    cpc: "text",
    cpm: "text",
    conversionRate: "text",
    sales: "text",
    roas: "text",
  };

  const filterOptions: Record<string, string[]> = {
    status: ["Draft", "On Hold", "Running", "Rejected", "Ended"],
    objective: ["Awareness", "Consideration", "Conversion"],
    adTypes: ["In Grid", "Carousel", "Banner", "Premium Banner"],
    mediaChannel: ["Onsite", "Offsite"],
    targeting: ["Geotargeting", "Keyword Targeting"],
    pacing: ["Under-pacing (<80%)", "On track (80% - 100%)", "Over-pacing (>100%)"],
  };

  // Filters dropdown management functions
  const addTempFilterRow = () => {
    setTempFilters([...tempFilters, {
      id: `filter-${Date.now()}`,
      field: "",
      operator: "Equal to",
      values: [],
    }]);
  };

  const removeTempFilterRow = (id: string) => {
    if (tempFilters.length > 1) {
      setTempFilters(tempFilters.filter(f => f.id !== id));
    }
  };

  const updateTempFilterField = (id: string, field: string) => {
    const defaultOperator = fieldOperators[field]?.[0] || "Equal to";
    setTempFilters(tempFilters.map(f => 
      f.id === id ? { ...f, field, operator: defaultOperator, values: [] } : f
    ));
  };

  const updateTempFilterOperator = (id: string, operator: string) => {
    setTempFilters(tempFilters.map(f => 
      f.id === id ? { ...f, operator } : f
    ));
  };

  const toggleTempFilterValue = (id: string, value: string) => {
    setTempFilters(tempFilters.map(f => {
      if (f.id === id) {
        const values = f.values.includes(value)
          ? f.values.filter(v => v !== value)
          : [...f.values, value];
        return { ...f, values };
      }
      return f;
    }));
  };

  const updateTempTextValue = (id: string, value: string) => {
    setTempFilters(tempFilters.map(f => 
      f.id === id ? { ...f, values: value ? [value] : [] } : f
    ));
  };

  const updateTempFilterValues = (id: string, values: string[]) => {
    setTempFilters(tempFilters.map(f => 
      f.id === id ? { ...f, values } : f
    ));
  };

  const handleApplyFilters = () => {
    // Keep all filter rows (including preloaded ones with empty values)
    // so they persist as template rows in the popover
    const filtersWithFields = tempFilters.filter(f => f.field);
    setAppliedFilters(filtersWithFields);
    setShowFiltersDropdown(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(appliedFilters);
    setShowFiltersDropdown(false);
  };

  // Quick filter options
  const quickFilterStatusOptions = [
    "Draft", "Scheduled", "On Hold", "Running", "Rejected", "Ended", "Paused",
  ];
  const quickFilterAwaitingOptions = [
    "Awaiting Verification by Retailer", "Awaiting Audience",
    "Awaiting Verification", "Awaiting Verification by Ad Platforms",
  ];
  const quickFilterTargetingOptions = [
    "Geotargeting", "Keyword Bid Multiplier", "Audience Bid Multiplier",
  ];
  const quickFilterObjectiveOptions = ["Consideration", "Conversion", "Awareness"];
  const quickFilterAdTypesOnsite = ["Product Listing Ads", "Auction Banner"];
  const quickFilterAdTypesOffsite = ["Meta", "Google", "Pinterest"];
  const allQuickAdTypeOptions = [...quickFilterAdTypesOnsite, ...quickFilterAdTypesOffsite];

  const toggleQuickValue = (
    current: string[],
    setter: (v: string[]) => void,
    value: string,
  ) => {
    setter(
      current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    );
  };

  // Parent group toggle: if all children are selected, deselect all; otherwise select all
  const toggleQuickGroup = (
    current: string[],
    setter: (v: string[]) => void,
    children: string[],
  ) => {
    const allSelected = children.every(c => current.includes(c));
    if (allSelected) {
      setter(current.filter(v => !children.includes(v)));
    } else {
      setter([...current, ...children.filter(c => !current.includes(c))]);
    }
  };

  const quickFilterActiveCount =
    quickFilterStatus.length + quickFilterTargeting.length +
    quickFilterObjective.length + quickFilterAdTypes.length +
    quickFilterMediaPlan.length;

  const quickFilterFieldNames = ["status", "targeting", "objective", "adTypes", "mediaPlan"];
  const advancedFilterActiveCount = appliedFilters.filter(
    f => f.field && f.values && f.values.length > 0 && !quickFilterFieldNames.includes(f.field)
  ).length;

  const totalFilterCount = quickFilterActiveCount + advancedFilterActiveCount;

  const clearAllQuickFilters = () => {
    setQuickFilterStatus([]);
    setQuickFilterTargeting([]);
    setQuickFilterObjective([]);
    setQuickFilterAdTypes([]);
    setQuickFilterMediaPlan([]);
  };

  const handleSaveCurrentView = () => {
    if (!saveViewName.trim()) return;
    
    // Add to custom views
    if (!customViews.includes(saveViewName)) {
      setCustomViews([...customViews, saveViewName]);
      setTabOrder([...tabOrder, saveViewName]);
    }
    
    // Store the current filters, columns, and sort for this new view
    setViewConfigurations(prev => ({
      ...prev,
      [saveViewName]: {
        filters: appliedFilters,
        columns: visibleColumns,
        sortColumn,
        sortDirection,
        quickFilters: {
          status: quickFilterStatus.length > 0 ? [...quickFilterStatus] : undefined,
          targeting: quickFilterTargeting.length > 0 ? [...quickFilterTargeting] : undefined,
          objective: quickFilterObjective.length > 0 ? [...quickFilterObjective] : undefined,
          adTypes: quickFilterAdTypes.length > 0 ? [...quickFilterAdTypes] : undefined,
          mediaPlan: quickFilterMediaPlan.length > 0 ? [...quickFilterMediaPlan] : undefined,
        },
      }
    }));
    
    // Navigate to the new view
    setActiveViewFilter(saveViewName);
    
    // Close dialog and reset
    setShowSaveViewDialog(false);
    setSaveViewName("");
  };

  // Column management for Create View drawer
  const allColumns: Column[] = [
    { id: "id", label: "ID", category: "Campaign Setup" },
    { id: "name", label: "Name", category: "Campaign Setup" },
    { id: "status", label: "Status", category: "Campaign Setup" },
    { id: "destination", label: "Destination", category: "Campaign Setup" },
    { id: "startDate", label: "Start Date", category: "Campaign Setup" },
    { id: "endDate", label: "End Date", category: "Campaign Setup" },
    { id: "flightCompleted", label: "% Flight Completed", category: "Campaign Setup" },
    { id: "budget", label: "Budget", category: "Campaign Setup" },
    { id: "spend", label: "Spend", category: "Campaign Setup" },
    { id: "budgetSpent", label: "% Budget Spent", category: "Campaign Setup" },
    { id: "remainingBudget", label: "Remaining Budget", category: "Campaign Setup" },
    { id: "pacing", label: "Pacing", category: "Performance" },
    { id: "ctr", label: "CTR", category: "Performance" },
    { id: "cpc", label: "CPC", category: "Performance" },
    { id: "cpm", label: "CPM", category: "Performance" },
    { id: "conversionRate", label: "Conversion Rate", category: "Performance" },
    { id: "sales", label: "Sales", category: "Performance" },
    { id: "roas", label: "ROAS", category: "Performance" },
    { id: "mediaPlan", label: "Media Plan", category: "Campaign Setup" },
    { id: "brandId", label: "Brand ID", category: "Campaign Setup" },
    { id: "lastModified", label: "Last Modified", category: "Campaign Setup" },
  ];

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: "113602",
      name: "Winter Workshop 2026",
      category: "Conversions",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      objective: "Conversions",
      startDate: "Jan 24, 2026",
      endDate: "Feb 28, 2026",
      budget: 27912,
      spend: 25410.24,
      pacing: "90%",
      ctr: "0.18%",
      roas: "0.6x",
      sales: "$5,625",
      optimizations: "🔼 Increase Bids",
      lastModified: "Feb 5, 2026 at 9:15 AM",
      mediaPlan: "Q1-2026-Winter-Promo",
      benchmarks: {
        pacing: { wow: -5.2, yoy: 12.3 },
        spend: { wow: 8.1, yoy: -3.4 },
        ctr: { wow: -12.5, yoy: 8.7 },
        roas: { wow: -15.3, yoy: -22.1 },
        sales: { wow: -9.8, yoy: -18.5 }
      },
      pacingContext: {
        dailyTrend: [
          { day: "Sat, Feb 21", shortDay: "Feb 21", actual: 678, expected: 640 },
          { day: "Sun, Feb 22", shortDay: "Feb 22", actual: 615, expected: 640 },
          { day: "Mon, Feb 23", shortDay: "Feb 23", actual: 582, expected: 798 },
          { day: "Tue, Feb 24", shortDay: "Feb 24", actual: 648, expected: 798 },
          { day: "Wed, Feb 25", shortDay: "Feb 25", actual: 712, expected: 798 },
          { day: "Thu, Feb 26", shortDay: "Feb 26", actual: 748, expected: 798 },
          { day: "Fri, Feb 27", shortDay: "Feb 27", actual: 772, expected: 798 }
        ],
        projectedEndSpend: 27520,
        headerNote: "Pacing for this campaign is up 27% compared to the previous 7-day period.",
        projectionNote: "Budget was increased on Feb 23, which temporarily lowered pacing due to the higher spend target."
      }
    },
    {
      id: "113601",
      name: "Weekend Flash Sale",
      category: "Sales",
      status: "Running",
      destination: "Google PMAX",
      platform: "Google PMAX",
      startDate: "Jan 23, 2026",
      endDate: "Feb 10, 2026",
      budget: 24625,
      spend: 20935.38,
      pacing: "98%",
      ctr: "0.37%",
      roas: "3.1x",
      sales: "$23,950",
      optimizations: "⭐ 2 Optimizations",
      lastModified: "Feb 4, 2026 at 11:30 PM",
      benchmarks: {
        pacing: { wow: 2.1, yoy: 5.6 },
        spend: { wow: 15.3, yoy: 18.2 },
        ctr: { wow: 8.4, yoy: 12.1 },
        roas: { wow: 12.7, yoy: 25.4 },
        sales: { wow: 18.2, yoy: 32.5 }
      },
      mediaPlan: "Q1-2026-Winter-Promo",
    },
    {
      id: "113603",
      name: "Spring Clearance Push",
      category: "Sales",
      status: "Running",
      destination: "Google Search",
      platform: "Google Search",
      objective: "Sales",
      startDate: "Feb 4, 2026",
      endDate: "Feb 15, 2026",
      budget: 35000,
      spend: 33739.50,
      pacing: "102%",
      ctr: "0.45%",
      roas: "4.2x",
      sales: "$52,290",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 5, 2026 at 7:45 AM",
      mediaPlan: "Spring-Launch-2026",
      benchmarks: {
        pacing: { wow: 3.5, yoy: 8.9 },
        spend: { wow: 22.1, yoy: 28.7 },
        ctr: { wow: 15.3, yoy: 22.4 },
        roas: { wow: 18.6, yoy: 35.2 },
        sales: { wow: 25.4, yoy: 42.8 }
      }
    },
    {
      id: "113604",
      name: "Brand Awareness Q1",
      category: "Awareness",
      status: "Paused",
      destination: "Pinterest",
      platform: "Pinterest",
      objective: "Brand Awareness",
      startDate: "Feb 5, 2026",
      endDate: "Jan 21, 2026",
      budget: 15000,
      spend: 38617.50,
      pacing: "92%",
      ctr: "0.22%",
      roas: "0.9x",
      sales: "$12,825",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 4, 2026 at 3:20 PM",
    },
    {
      id: "113605",
      name: "Valentine's Day Special",
      category: "Sales",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      objective: "Traffic",
      startDate: "Jan 10, 2026",
      endDate: "Feb 14, 2026",
      budget: 42000,
      spend: 22764.80,
      pacing: "107%",
      ctr: "0.31%",
      roas: "3.5x",
      sales: "$29,400",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Dec 12, 2025 at 6:19 PM",
      mediaPlan: "Valentines-2026",
      benchmarks: {
        pacing: { wow: 4.2, yoy: 11.5 },
        spend: { wow: 18.7, yoy: 24.3 },
        ctr: { wow: 6.8, yoy: 15.2 },
        roas: { wow: 9.3, yoy: 18.7 },
        sales: { wow: 12.5, yoy: 25.1 }
      }
    },
    {
      id: "113606",
      name: "New Product Launch - Power Tools",
      category: "Awareness",
      status: "Running",
      destination: "Google Search",
      platform: "Google Search",
      startDate: "Jan 12, 2026",
      endDate: "Feb 28, 2026",
      budget: 65000,
      spend: 35230.00,
      pacing: "92%",
      ctr: "0.32%",
      roas: "1.5x",
      sales: "$19,500",
      optimizations: "🔼 Increase Bids",
      lastModified: "Nov 27, 2025 at 10:31 AM",
    },
    {
      id: "113607",
      name: "Mobile App Install Campaign",
      category: "Conversions",
      status: "Paused",
      destination: "Pinterest",
      platform: "Pinterest",
      startDate: "Jan 15, 2026",
      endDate: "Jan 30, 2026",
      budget: 18500,
      spend: 25067.50,
      pacing: "82%",
      ctr: "0.20%",
      roas: "0.7x",
      sales: "$6,475",
      optimizations: "⭐ 2 Optimizations",
      lastModified: "Nov 21, 2025 at 12:42 PM",
    },
    {
      id: "113608",
      name: "Winter Gear Clearance",
      category: "Sales",
      status: "Running",
      destination: "Google PMAX",
      platform: "Google PMAX",
      startDate: "Jan 18, 2026",
      endDate: "Feb 15, 2026",
      budget: 28000,
      spend: 15176.00,
      pacing: "100%",
      ctr: "0.35%",
      roas: "2.2x",
      sales: "$12,320",
      optimizations: "📦 Add Products",
      lastModified: "Jan 25, 2026 at 3:15 PM",
      mediaPlan: "Q1-2026-Winter-Promo",
    },
    {
      id: "113609",
      name: "Professional Contractors Bundle",
      category: "Sales",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      objective: "Sales",
      startDate: "Jan 20, 2026",
      endDate: "Mar 20, 2026",
      budget: 38000,
      spend: 10298.00,
      pacing: "72%",
      ctr: "0.22%",
      roas: "1.1x",
      sales: "$4,280",
      optimizations: "🔼 Increase Bids",
      lastModified: "Jan 18, 2026 at 9:45 AM",
    },
    {
      id: "113610",
      name: "DIY Home Projects 2026",
      category: "Awareness",
      status: "Paused",
      destination: "Pinterest",
      platform: "Pinterest",
      startDate: "Jan 5, 2026",
      endDate: "Mar 31, 2026",
      budget: 95000,
      spend: 41192.00,
      pacing: "99%",
      ctr: "0.58%",
      roas: "2.1x",
      sales: "$31,920",
      optimizations: "🔼 Increase Bids",
      lastModified: "Jan 15, 2026 at 4:20 PM",
    },
    {
      id: "113611",
      name: "Summer Preview Collection",
      category: "Awareness",
      status: "Running",
      destination: "Google Search",
      platform: "Google Search",
      startDate: "Jan 22, 2026",
      endDate: "Mar 28, 2026",
      budget: 52000,
      spend: 14092.00,
      pacing: "68%",
      ctr: "0.39%",
      roas: "1.4x",
      sales: "$7,280",
      optimizations: "🔼 Increase Bids",
      lastModified: "Jan 22, 2026 at 11:30 AM",
      mediaPlan: "Spring-Launch-2026",
    },
    {
      id: "113612",
      name: "Trade Professional Rewards",
      category: "Conversions",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      startDate: "Jan 1, 2026",
      endDate: "Jan 31, 2026",
      budget: 31000,
      spend: 67208.00,
      pacing: "103%",
      ctr: "0.34%",
      roas: "3.8x",
      sales: "$94,240",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Dec 30, 2025 at 2:10 PM",
    },
    {
      id: "113613",
      name: "Battery Technology Innovation",
      category: "Awareness",
      status: "Paused",
      destination: "Google PMAX",
      platform: "Google PMAX",
      startDate: "Jan 10, 2026",
      endDate: "Feb 10, 2026",
      budget: 44000,
      spend: 35772.00,
      pacing: "101%",
      ctr: "0.51%",
      roas: "2.3x",
      sales: "$30,360",
      optimizations: "📦 Add Products",
      lastModified: "Jan 9, 2026 at 8:00 AM",
    },
    {
      id: "113614",
      name: "Spring Garden Preparation",
      category: "Sales",
      status: "Running",
      destination: "Pinterest",
      platform: "Pinterest",
      startDate: "Jan 15, 2026",
      endDate: "Mar 8, 2026",
      budget: 68000,
      spend: 46070.00,
      pacing: "97%",
      ctr: "0.44%",
      roas: "3.4x",
      sales: "$57,800",
      optimizations: "⭐ 2 Optimizations",
      lastModified: "Jan 14, 2026 at 5:50 PM",
      mediaPlan: "Valentines-2026",
    },
    {
      id: "113615",
      name: "Construction Site Safety",
      category: "Awareness",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      startDate: "Jan 8, 2026",
      endDate: "Feb 8, 2026",
      budget: 29000,
      spend: 23577.00,
      pacing: "105%",
      ctr: "0.27%",
      roas: "2.0x",
      sales: "$17,400",
      optimizations: "🔼 Increase Bids",
      lastModified: "Jan 7, 2026 at 10:15 AM",
    },
    {
      id: "113616",
      name: "Cordless Tool Upgrade Event",
      category: "Sales",
      status: "Paused",
      destination: "Google Search",
      platform: "Google Search",
      startDate: "Jan 12, 2026",
      endDate: "Jan 26, 2026",
      budget: 36000,
      spend: 48780.00,
      pacing: "98%",
      ctr: "0.56%",
      roas: "4.5x",
      sales: "$81,000",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Jan 11, 2026 at 1:40 PM",
    },
    {
      id: "113617",
      name: "Workshop Organization Systems",
      category: "Conversions",
      status: "Running",
      destination: "Google PMAX",
      platform: "Google PMAX",
      startDate: "Jan 20, 2026",
      endDate: "Feb 25, 2026",
      budget: 41000,
      spend: 22222.00,
      pacing: "108%",
      ctr: "0.38%",
      roas: "3.0x",
      sales: "$24,600",
      optimizations: "📦 Add Products",
      lastModified: "Jan 19, 2026 at 3:25 PM",
    },
    {
      id: "113618",
      name: "Outdoor Power Equipment Sale",
      category: "Sales",
      status: "Running",
      destination: "Pinterest",
      platform: "Pinterest",
      startDate: "Jan 5, 2026",
      endDate: "Feb 5, 2026",
      budget: 55000,
      spend: 59620.00,
      pacing: "102%",
      ctr: "0.49%",
      roas: "3.6x",
      optimizations: "⭐ 2 Optimizations",
      lastModified: "Jan 4, 2026 at 11:00 AM",
    },
    {
      id: "113619",
      name: "Industrial Equipment Showcase",
      category: "Awareness",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      startDate: "Jan 18, 2026",
      endDate: "Mar 7, 2026",
      budget: 78000,
      spend: 42276.00,
      pacing: "94%",
      ctr: "0.33%",
      roas: "2.5x",
      optimizations: "🔼 Increase Bids",
      lastModified: "Jan 17, 2026 at 2:30 PM",
    },
    {
      id: "113620",
      name: "Weekend Warrior Specials",
      category: "Sales",
      status: "Running",
      destination: "Google Search",
      platform: "Google Search",
      startDate: "Jan 1, 2026",
      endDate: "Jan 31, 2026",
      budget: 32000,
      spend: 69376.00,
      pacing: "100%",
      ctr: "0.61%",
      roas: "4.8x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Dec 28, 2025 at 4:45 PM",
    },
    {
      id: "113621",
      name: "Commercial Contractor Program",
      category: "Conversions",
      status: "Running",
      destination: "Google PMAX",
      platform: "Google PMAX",
      startDate: "Jan 10, 2026",
      endDate: "Mar 28, 2026",
      budget: 59000,
      spend: 47967.00,
      pacing: "85%",
      ctr: "0.28%",
      roas: "1.3x",
      optimizations: "🔼 Increase Bids",
      lastModified: "Jan 9, 2026 at 6:20 PM",
    },
    {
      id: "113622",
      name: "Renovation Season Kickoff",
      category: "Awareness",
      status: "Paused",
      destination: "Pinterest",
      platform: "Pinterest",
      startDate: "Jan 15, 2026",
      endDate: "Mar 1, 2026",
      budget: 71000,
      spend: 57723.00,
      pacing: "109%",
      ctr: "0.47%",
      roas: "2.6x",
      optimizations: "⭐ 2 Optimizations",
      lastModified: "Jan 14, 2026 at 9:10 AM",
    },
    {
      id: "113623",
      name: "Heavy Duty Tool Bundle",
      category: "Sales",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      startDate: "Jan 22, 2026",
      endDate: "Feb 22, 2026",
      budget: 46000,
      spend: 24932.00,
      pacing: "95%",
      ctr: "0.35%",
      roas: "3.9x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Jan 21, 2026 at 7:55 AM",
    },
    {
      id: "113624",
      name: "Smart Home Workshop Tools",
      category: "Conversions",
      status: "Running",
      destination: "Google Search",
      platform: "Google Search",
      startDate: "Jan 8, 2026",
      endDate: "Feb 15, 2026",
      budget: 37000,
      spend: 30081.00,
      pacing: "106%",
      ctr: "0.53%",
      roas: "2.9x",
      optimizations: "🔼 Increase Bids",
      lastModified: "Jan 7, 2026 at 3:05 PM",
    },
    {
      id: "113625",
      name: "Easter Promo - Garden Essentials",
      category: "Sales",
      status: "Scheduled",
      destination: "Meta",
      platform: "Meta",
      objective: "Sales",
      brandId: "BRD-042",
      startDate: "Mar 15, 2026",
      endDate: "Apr 12, 2026",
      budget: 48000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      sales: "$0",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 26, 2026 at 2:30 PM",
      mediaPlan: "Spring-Launch-2026",
    },
    {
      id: "113626",
      name: "Contractor Loyalty Retargeting",
      category: "Conversions",
      status: "Paused",
      destination: "Google PMAX",
      platform: "Google PMAX",
      objective: "Conversions",
      brandId: "BRD-018",
      startDate: "Jan 6, 2026",
      endDate: "Mar 6, 2026",
      budget: 34000,
      spend: 18462.00,
      pacing: "74%",
      ctr: "0.19%",
      roas: "1.2x",
      sales: "$8,160",
      cpc: "$2.85",
      cpm: "$14.20",
      conversionRate: "1.8%",
      optimizations: "🔼 Increase Bids",
      lastModified: "Feb 18, 2026 at 11:05 AM",
      benchmarks: {
        pacing: { wow: -8.4, yoy: -2.1 },
        spend: { wow: -12.3, yoy: -5.6 },
        ctr: { wow: -6.1, yoy: 3.2 },
        roas: { wow: -18.5, yoy: -10.3 },
        sales: { wow: -14.2, yoy: -8.8 }
      }
    },
    {
      id: "113627",
      name: "Summer Outdoor Living Preview",
      category: "Awareness",
      status: "Draft",
      destination: "Pinterest",
      platform: "Pinterest",
      objective: "Brand Awareness",
      brandId: "BRD-042",
      startDate: "Apr 1, 2026",
      endDate: "May 31, 2026",
      budget: 82000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 25, 2026 at 9:40 AM",
    },
    {
      id: "113628",
      name: "Black Friday Early Bird - Power Drills",
      category: "Sales",
      status: "Ended",
      destination: "Google Search",
      platform: "Google Search",
      objective: "Sales",
      brandId: "BRD-007",
      startDate: "Nov 15, 2025",
      endDate: "Dec 1, 2025",
      budget: 120000,
      spend: 118440.00,
      pacing: "99%",
      ctr: "0.72%",
      roas: "5.8x",
      sales: "$254,100",
      cpc: "$0.92",
      cpm: "$6.60",
      conversionRate: "4.2%",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Dec 2, 2025 at 12:00 AM",
      mediaPlan: "Q4-2025-Holiday",
      benchmarks: {
        pacing: { wow: 0.2, yoy: 3.1 },
        spend: { wow: 1.5, yoy: 22.8 },
        ctr: { wow: 5.3, yoy: 18.4 },
        roas: { wow: 8.9, yoy: 32.6 },
        sales: { wow: 12.1, yoy: 45.3 }
      }
    },
    {
      id: "113629",
      name: "Holiday Gift Guide Campaign",
      category: "Sales",
      status: "Ended",
      destination: "Meta",
      platform: "Meta",
      objective: "Sales",
      brandId: "BRD-007",
      startDate: "Dec 1, 2025",
      endDate: "Dec 25, 2025",
      budget: 95000,
      spend: 93862.50,
      pacing: "101%",
      ctr: "0.64%",
      roas: "4.9x",
      sales: "$169,950",
      cpc: "$1.15",
      cpm: "$7.40",
      conversionRate: "3.6%",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Dec 26, 2025 at 1:00 AM",
      mediaPlan: "Q4-2025-Holiday",
      benchmarks: {
        pacing: { wow: 1.1, yoy: 4.8 },
        spend: { wow: 3.2, yoy: 19.5 },
        ctr: { wow: 4.7, yoy: 14.2 },
        roas: { wow: 6.3, yoy: 28.9 },
        sales: { wow: 9.5, yoy: 38.4 }
      }
    },
    {
      id: "113630",
      name: "Pro Installer Network Launch",
      category: "Conversions",
      status: "On Hold",
      destination: "Google PMAX",
      platform: "Google PMAX",
      objective: "Conversions",
      brandId: "BRD-018",
      startDate: "Feb 1, 2026",
      endDate: "Mar 31, 2026",
      budget: 56000,
      spend: 12880.00,
      pacing: "62%",
      ctr: "0.24%",
      roas: "1.8x",
      sales: "$8,568",
      cpc: "$3.10",
      cpm: "$12.90",
      conversionRate: "2.1%",
      optimizations: "⭐ 2 Optimizations",
      lastModified: "Feb 14, 2026 at 4:15 PM",
    },
    {
      id: "113631",
      name: "Warehouse Clearance - Plumbing",
      category: "Sales",
      status: "Running",
      destination: "Google Search",
      platform: "Google Search",
      objective: "Sales",
      brandId: "BRD-031",
      startDate: "Feb 10, 2026",
      endDate: "Mar 10, 2026",
      budget: 29500,
      spend: 14161.00,
      pacing: "96%",
      ctr: "0.42%",
      roas: "3.1x",
      sales: "$16,200",
      cpc: "$1.48",
      cpm: "$6.25",
      conversionRate: "2.9%",
      optimizations: "📦 Add Products",
      lastModified: "Feb 24, 2026 at 10:20 AM",
      mediaPlan: "Spring-Launch-2026",
    },
    {
      id: "113632",
      name: "Smart Thermostat Awareness",
      category: "Awareness",
      status: "Rejected",
      destination: "Pinterest",
      platform: "Pinterest",
      objective: "Brand Awareness",
      brandId: "BRD-055",
      startDate: "Mar 1, 2026",
      endDate: "Apr 30, 2026",
      budget: 67000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 20, 2026 at 3:50 PM",
    },
    {
      id: "113633",
      name: "Q1 Electrical Supplies Push",
      category: "Sales",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      objective: "Sales",
      brandId: "BRD-031",
      startDate: "Jan 15, 2026",
      endDate: "Mar 11, 2026",
      budget: 43000,
      spend: 27735.00,
      pacing: "103%",
      ctr: "0.36%",
      roas: "2.8x",
      sales: "$28,700",
      cpc: "$1.72",
      cpm: "$6.20",
      conversionRate: "2.5%",
      optimizations: "⭐ 2 Optimizations",
      lastModified: "Feb 23, 2026 at 1:45 PM",
      benchmarks: {
        pacing: { wow: 1.8, yoy: 6.3 },
        spend: { wow: 10.5, yoy: 15.2 },
        ctr: { wow: 3.2, yoy: 8.7 },
        roas: { wow: 5.6, yoy: 14.3 },
        sales: { wow: 8.4, yoy: 21.6 }
      }
    },
    {
      id: "113634",
      name: "Deck & Patio Season Prep",
      category: "Awareness",
      status: "Scheduled",
      destination: "Google PMAX",
      platform: "Google PMAX",
      objective: "Brand Awareness",
      brandId: "BRD-042",
      startDate: "Mar 20, 2026",
      endDate: "May 15, 2026",
      budget: 54000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 27, 2026 at 8:30 AM",
      mediaPlan: "Spring-Launch-2026",
    },
    {
      id: "113635",
      name: "Flooring Installation Services",
      category: "Conversions",
      status: "Paused",
      destination: "Google Search",
      platform: "Google Search",
      objective: "Conversions",
      brandId: "BRD-031",
      startDate: "Jan 20, 2026",
      endDate: "Feb 28, 2026",
      budget: 38500,
      spend: 19635.00,
      pacing: "78%",
      ctr: "0.26%",
      roas: "1.5x",
      sales: "$10,890",
      cpc: "$2.55",
      cpm: "$9.80",
      conversionRate: "1.6%",
      optimizations: "🔼 Increase Bids",
      lastModified: "Feb 12, 2026 at 5:30 PM",
    },
    {
      id: "113636",
      name: "Year-End Inventory Blowout",
      category: "Sales",
      status: "Ended",
      destination: "Google PMAX",
      platform: "Google PMAX",
      objective: "Sales",
      brandId: "BRD-007",
      startDate: "Dec 10, 2025",
      endDate: "Dec 31, 2025",
      budget: 85000,
      spend: 83810.00,
      pacing: "100%",
      ctr: "0.58%",
      roas: "4.1x",
      sales: "$127,160",
      cpc: "$1.05",
      cpm: "$6.10",
      conversionRate: "3.4%",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Jan 1, 2026 at 12:00 AM",
      mediaPlan: "Q4-2025-Holiday",
    },
    {
      id: "113637",
      name: "Paint & Stain Spring Refresh",
      category: "Sales",
      status: "Running",
      destination: "Pinterest",
      platform: "Pinterest",
      objective: "Sales",
      brandId: "BRD-042",
      startDate: "Feb 15, 2026",
      endDate: "Mar 31, 2026",
      budget: 39000,
      spend: 10140.00,
      pacing: "101%",
      ctr: "0.48%",
      roas: "2.6x",
      sales: "$9,750",
      cpc: "$1.30",
      cpm: "$6.80",
      conversionRate: "2.7%",
      optimizations: "📦 Add Products",
      lastModified: "Feb 26, 2026 at 6:10 PM",
      mediaPlan: "Spring-Launch-2026",
    },
    {
      id: "113638",
      name: "HVAC Seasonal Maintenance Ads",
      category: "Conversions",
      status: "Draft",
      destination: "Meta",
      platform: "Meta",
      objective: "Conversions",
      brandId: "BRD-055",
      startDate: "Mar 10, 2026",
      endDate: "May 10, 2026",
      budget: 61000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 24, 2026 at 4:00 PM",
    },
    {
      id: "113639",
      name: "Kitchen Remodel Showcase",
      category: "Awareness",
      status: "Running",
      destination: "Meta",
      platform: "Meta",
      objective: "Brand Awareness",
      brandId: "BRD-018",
      startDate: "Feb 1, 2026",
      endDate: "Mar 28, 2026",
      budget: 72000,
      spend: 30960.00,
      pacing: "76%",
      ctr: "0.18%",
      roas: "1.2x",
      sales: "$13,720",
      cpc: "$1.62",
      cpm: "$6.65",
      conversionRate: "2.3%",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 25, 2026 at 11:15 AM",
      benchmarks: {
        pacing: { wow: 0.5, yoy: 4.1 },
        spend: { wow: 7.8, yoy: 13.9 },
        ctr: { wow: 2.1, yoy: 9.5 },
        roas: { wow: 4.3, yoy: 11.8 },
        sales: { wow: 6.8, yoy: 18.2 }
      }
    },
    {
      id: "113640",
      name: "Roofing Materials Spring Drive",
      category: "Sales",
      status: "Running",
      destination: "Google Search",
      platform: "Google Search",
      objective: "Sales",
      brandId: "BRD-031",
      startDate: "Feb 5, 2026",
      endDate: "Mar 20, 2026",
      budget: 47000,
      spend: 22560.00,
      pacing: "105%",
      ctr: "0.39%",
      roas: "3.4x",
      sales: "$28,350",
      cpc: "$1.55",
      cpm: "$6.05",
      conversionRate: "3.1%",
      optimizations: "🔼 Increase Bids",
      lastModified: "Feb 27, 2026 at 7:45 AM",
    },
    {
      id: "113641",
      name: "Bathroom Renovation Starter Kit",
      category: "Sales",
      status: "Draft",
      destination: "Google Search",
      platform: "Google Search",
      objective: "Sales",
      brandId: "BRD-031",
      startDate: "Apr 1, 2026",
      endDate: "May 31, 2026",
      budget: 53000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 27, 2026 at 10:15 AM",
    },
    {
      id: "113642",
      name: "Landscaping Tools Launch - Spring",
      category: "Awareness",
      status: "Draft",
      destination: "Pinterest",
      platform: "Pinterest",
      objective: "Brand Awareness",
      brandId: "BRD-042",
      startDate: "Mar 25, 2026",
      endDate: "May 25, 2026",
      budget: 74000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 26, 2026 at 3:20 PM",
    },
    {
      id: "113643",
      name: "Commercial Lighting Upgrade Promo",
      category: "Conversions",
      status: "Draft",
      destination: "Google PMAX",
      platform: "Google PMAX",
      objective: "Conversions",
      brandId: "BRD-055",
      startDate: "Apr 15, 2026",
      endDate: "Jun 15, 2026",
      budget: 46000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 25, 2026 at 5:45 PM",
    },
    {
      id: "113644",
      name: "Father's Day Tool Gift Guide",
      category: "Sales",
      status: "Draft",
      destination: "Meta",
      platform: "Meta",
      objective: "Sales",
      brandId: "BRD-007",
      startDate: "May 15, 2026",
      endDate: "Jun 21, 2026",
      budget: 88000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 24, 2026 at 1:30 PM",
    },
    {
      id: "113645",
      name: "Garage Organisation Systems Q2",
      category: "Awareness",
      status: "Draft",
      destination: "Google Search",
      platform: "Google Search",
      objective: "Brand Awareness",
      brandId: "BRD-018",
      startDate: "Apr 5, 2026",
      endDate: "Jun 5, 2026",
      budget: 41000,
      spend: 0,
      pacing: "0%",
      ctr: "0.00%",
      roas: "0.0x",
      optimizations: "✓ Campaign Optimized",
      lastModified: "Feb 23, 2026 at 9:00 AM",
    },
  ]);

  // Enrich campaigns with filter-related fields (adTypes, mediaChannel, targeting, normalised objective)
  const enrichCampaign = (c: Campaign): Campaign => {
    const idNum = parseInt(c.id);

    // Ad Types: deterministic based on platform + ID
    const adTypesPool = ["In Grid", "Carousel", "Banner", "Premium Banner"];
    const adTypes = c.adTypes || adTypesPool[idNum % 4];

    // Media Channel: Google → mostly Onsite, Meta/Pinterest → mostly Offsite
    const mediaChannel = c.mediaChannel || (
      c.platform.includes("Google")
        ? (idNum % 5 === 0 ? "Offsite" : "Onsite")
        : (idNum % 6 === 0 ? "Onsite" : "Offsite")
    );

    // Targeting: mix of Geotargeting, Keyword Targeting, or both
    const targetingPool: string[][] = [
      ["Geotargeting"],
      ["Keyword Targeting"],
      ["Geotargeting", "Keyword Targeting"],
      ["Keyword Targeting"],
      ["Geotargeting"],
      ["Geotargeting", "Keyword Targeting"],
    ];
    const targeting = c.targeting || targetingPool[idNum % 6];

    // Normalise objective to filter-friendly values: Awareness | Consideration | Conversion
    // Explicit overrides for Consideration (otherwise no campaigns get it)
    const considerationIds = new Set(["113605", "113607", "113614", "113617", "113622"]);
    let objective = c.objective;
    if (considerationIds.has(c.id)) {
      objective = "Consideration";
    } else if (!objective) {
      objective = c.category === "Awareness" ? "Awareness" : "Conversion";
    } else {
      if (objective === "Brand Awareness") objective = "Awareness";
      else if (objective === "Traffic") objective = "Consideration";
      else if (objective === "Sales" || objective === "Conversions") objective = "Conversion";
    }

    return { ...c, adTypes, mediaChannel, targeting, objective };
  };

  const enrichedCampaigns = useMemo(() => campaigns.map(enrichCampaign), [campaigns]);

  // Derive media plan options from campaign data
  const quickFilterMediaPlanOptions = useMemo(() => {
    const plans = new Set<string>();
    campaigns.forEach(c => { if (c.mediaPlan) plans.add(c.mediaPlan); });
    return Array.from(plans).sort();
  }, [campaigns]);

  // Helper function to calculate campaign health (matching CampaignsTable logic)
  const calculateCampaignHealth = (campaign: Campaign) => {
    let healthScore = 100;

    // Check if paused
    if (campaign.status === "Paused") {
      healthScore -= 50;
    }

    // Check pacing
    const pacingValue = parseFloat(campaign.pacing);
    if (pacingValue < -30) {
      healthScore -= 20;
    } else if (pacingValue > 50) {
      healthScore -= 15;
    }

    // Check budget vs time alignment
    const calculateFlightCompletion = (startDate: string, endDate: string) => {
      const today = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (today < start) return 0;
      if (today > end) return 100;
      
      const totalDuration = end.getTime() - start.getTime();
      const elapsedDuration = today.getTime() - start.getTime();
      return (elapsedDuration / totalDuration) * 100;
    };

    const flightCompletion = calculateFlightCompletion(campaign.startDate, campaign.endDate);
    const budgetSpent = (campaign.spend / campaign.budget) * 100;
    const budgetTimeDiff = Math.abs(budgetSpent - flightCompletion);
    
    if (budgetTimeDiff > 40) {
      healthScore -= 15;
    }

    // Check CTR
    const ctrValue = parseFloat(campaign.ctr);
    if (ctrValue < 0.3) {
      healthScore -= 15;
    }

    // Check ROAS
    const roasValue = parseFloat(campaign.roas);
    if (roasValue < 1.0) {
      healthScore -= 20;
    }

    // Determine health status
    if (healthScore >= 70) {
      return "healthy";
    } else if (healthScore >= 50) {
      return "warning";
    } else {
      return "critical";
    }
  };

  // Helper: parse a date string to a Date object for comparison
  const parseFilterDate = (dateStr: string): Date | null => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper: get campaign field value for a given filter field
  const getCampaignFieldValue = (campaign: Campaign, field: string): string | string[] | undefined => {
    switch (field) {
      case "name": return campaign.name;
      case "id": return campaign.id;
      case "status": return campaign.status;
      case "objective": return campaign.objective || "";
      case "adTypes": return campaign.adTypes || "";
      case "mediaChannel": return campaign.mediaChannel || "";
      case "targeting": return campaign.targeting || [];
      case "startDate": return campaign.startDate;
      case "endDate": return campaign.endDate;
      case "mediaPlan": return campaign.mediaPlan || "";
      default: return undefined;
    }
  };

  // Check if a single campaign matches a single filter rule
  const matchesFilterRule = (campaign: Campaign, rule: FilterRule): boolean => {
    // Skip filters with no values set
    if (!rule.values || rule.values.length === 0) return true;
    if (!rule.field) return true;

    const fieldValue = getCampaignFieldValue(campaign, rule.field);
    if (fieldValue === undefined) return true;

    // --- Targeting: array field with contains / does not contain ---
    if (rule.field === "targeting") {
      const targetingArr = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
      if (rule.operator === "contains") {
        return rule.values.some(v => targetingArr.includes(v));
      } else if (rule.operator === "does not contain") {
        return !rule.values.some(v => targetingArr.includes(v));
      }
      return true;
    }

    // --- Date fields: startDate, endDate, lastModified ---
    if (rule.field === "startDate" || rule.field === "endDate" || rule.field === "lastModified") {
      const campaignDate = parseFilterDate(fieldValue as string);
      const filterDate = parseFilterDate(rule.values[0]);
      if (!campaignDate || !filterDate) return true;
      campaignDate.setHours(0, 0, 0, 0);
      filterDate.setHours(0, 0, 0, 0);

      switch (rule.operator) {
        case "is":
        case "is on": return campaignDate.getTime() === filterDate.getTime();
        case "is not": return campaignDate.getTime() !== filterDate.getTime();
        case "is after":
        case "is on or after": return campaignDate.getTime() >= filterDate.getTime();
        case "is before":
        case "is on or before": return campaignDate.getTime() <= filterDate.getTime();
        default: return true;
      }
    }

    // --- Text fields: name, id, mediaPlan (case-insensitive partial match) ---
    if (rule.field === "name" || rule.field === "id" || rule.field === "mediaPlan") {
      const strValue = (fieldValue as string).toLowerCase();
      const filterVal = rule.values[0]?.toLowerCase() || "";
      if (rule.operator === "is") {
        return strValue.includes(filterVal);
      } else if (rule.operator === "is not") {
        return !strValue.includes(filterVal);
      }
      return true;
    }

    // --- Dropdown fields: status, objective, adTypes, mediaChannel ---
    const strValue = fieldValue as string;
    if (rule.operator === "is") {
      return rule.values.includes(strValue);
    } else if (rule.operator === "is not") {
      return !rule.values.includes(strValue);
    }

    return true;
  };

  const filteredCampaigns = enrichedCampaigns.filter(campaign => {
    // NOTE: The date range picker scopes performance metrics only.
    // It does NOT filter campaign visibility. Campaigns that ended yesterday,
    // are paused mid-range, or have any other status still appear as long as
    // they generated data within the selected window.

    // Search filter
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.id.includes(searchQuery);
    
    if (!matchesSearch) return false;

    // Quick filters (AND across categories, OR within each category)
    if (quickFilterStatus.length > 0) {
      if (!quickFilterStatus.includes(campaign.status)) return false;
    }
    if (quickFilterTargeting.length > 0) {
      const tArr = Array.isArray(campaign.targeting) ? campaign.targeting : [];
      if (!quickFilterTargeting.some(t => tArr.includes(t))) return false;
    }
    if (quickFilterObjective.length > 0) {
      if (!quickFilterObjective.includes(campaign.objective || "")) return false;
    }
    if (quickFilterAdTypes.length > 0) {
      const onsiteMatch = quickFilterAdTypes.some(t => ["Product Listing Ads", "Auction Banner"].includes(t)) &&
        (campaign.adTypes === "In Grid" || campaign.adTypes === "Banner" || campaign.adTypes === "Carousel" || campaign.adTypes === "Premium Banner" ||
         (campaign.destination || "").toLowerCase().includes("onsite"));
      const offMatch = quickFilterAdTypes.filter(t => ["Meta", "Google", "Pinterest"].includes(t));
      const platformMatch = offMatch.length > 0 && offMatch.some(p =>
        (campaign.platform || "").toLowerCase().includes(p.toLowerCase())
      );
      if (!onsiteMatch && !platformMatch) return false;
    }
    if (quickFilterMediaPlan.length > 0) {
      if (!quickFilterMediaPlan.includes(campaign.mediaPlan || "")) return false;
    }

    // Apply all filter rules (AND logic — campaign must match every rule)
    // Skip fields handled by quick filters to avoid double-filtering
    const quickFilterFields = ["status", "targeting", "objective", "adTypes", "mediaPlan"];
    const activeFilters = appliedFilters.filter(f => f.field && f.values && f.values.length > 0 && !quickFilterFields.includes(f.field));
    for (const rule of activeFilters) {
      // Skip display-only metric filters in the Needs Attention view (they use OR logic below)
      if (activeViewFilter === "attention" && ["pacing", "roas", "ctr"].includes(rule.field)) continue;
      if (!matchesFilterRule(campaign, rule)) return false;
    }

    // Additional view-specific filtering for Ending in 7d — ensure end date is today or later
    if (activeViewFilter === "ending7d") {
      const endDateStr = campaign.endDate;
      if (endDateStr) {
        const endDate = new Date(endDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (endDate < today) return false;
      }
    }

    // Needs Attention view — must satisfy at least one: pacing < 80%, ROAS < 1.5, CTR < 0.3%
    if (activeViewFilter === "attention") {
      const hasAnyStatusFilter = quickFilterStatus.length > 0 || activeFilters.some(f => f.field === "status");
      if (!hasAnyStatusFilter) {
        if (campaign.status !== "Running" && campaign.status !== "Paused") return false;
      }
      const pacingVal = parseFloat((campaign.pacing || "100").replace("%", ""));
      const roasVal = parseFloat((campaign.roas || "0").replace("x", ""));
      const ctrVal = parseFloat((campaign.ctr || "0").replace("%", ""));
      if (pacingVal >= 80 && roasVal >= 1.5 && ctrVal >= 0.3) return false;
      return true;
    }

    // Watchlist view — show only starred campaigns (all statuses)
    if (activeViewFilter === "watchlist") {
      return starredCampaignIds.has(campaign.id);
    }

    // If no status filter is active (neither quick nor advanced), apply default view-based filtering
    const hasAnyStatusFilter = quickFilterStatus.length > 0 || activeFilters.some(f => f.field === "status");
    if (!hasAnyStatusFilter) {
      if (activeViewFilter === "running") {
        // "All Campaigns" excludes Draft & Scheduled — they have no performance data
        if (campaign.status === "Draft" || campaign.status === "Scheduled" || campaign.status === "Rejected") return false;
      } else if (activeViewFilter === "draft") {
        return campaign.status === "Draft";
      } else if (activeViewFilter === "ending7d") {
        return campaign.status === "Running" || campaign.status === "Paused";
      }
    }
    
    return true;
  });

  // Compute campaign counts per tab (base counts without quick/advanced filters)
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // "running" (All Campaigns): exclude Draft, Scheduled, Rejected
    counts["running"] = enrichedCampaigns.filter(c =>
      c.status !== "Draft" && c.status !== "Scheduled" && c.status !== "Rejected"
    ).length;
    
    // "attention" (Needs Attention): Running/Paused with poor metrics
    counts["attention"] = enrichedCampaigns.filter(c => {
      if (c.status !== "Running" && c.status !== "Paused") return false;
      const pacingVal = parseFloat((c.pacing || "100").replace("%", ""));
      const roasVal = parseFloat((c.roas || "0").replace("x", ""));
      const ctrVal = parseFloat((c.ctr || "0").replace("%", ""));
      return pacingVal < 80 || roasVal < 1.5 || ctrVal < 0.3;
    }).length;
    
    // "draft" (Drafts): only Draft status
    counts["draft"] = enrichedCampaigns.filter(c => c.status === "Draft").length;
    
    // "watchlist": starred campaigns
    counts["watchlist"] = starredCampaignIds.size;
    
    // "ending7d": Running/Paused with end date within 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    counts["ending7d"] = enrichedCampaigns.filter(c => {
      if (c.status !== "Running" && c.status !== "Paused") return false;
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      return endDate >= today;
    }).length;
    
    // Custom views: count campaigns that pass their saved filters
    for (const viewId of customViews) {
      const config = viewConfigurations[viewId];
      if (config?.filters) {
        counts[viewId] = enrichedCampaigns.filter(c => {
          for (const rule of config.filters) {
            if (!rule.field || !rule.values || rule.values.length === 0) continue;
            if (rule.field === "status") {
              if (rule.operator === "is" && !rule.values.includes(c.status)) return false;
              if (rule.operator === "is not" && rule.values.includes(c.status)) return false;
            }
          }
          return true;
        }).length;
      } else {
        counts[viewId] = enrichedCampaigns.length;
      }
    }
    
    return counts;
  }, [enrichedCampaigns, starredCampaignIds.size, customViews, viewConfigurations]);

  const handleSaveCustomView = (viewName: string) => {
    setCustomViews([...customViews, viewName]);
    setTabOrder([...tabOrder, viewName]); // Add to tab order
    setMonitoringView(viewName);
    // Store the current filters, columns, and sort for this new view
    setViewConfigurations(prev => ({
      ...prev,
      [viewName]: {
        filters: appliedFilters,
        columns: visibleColumns,
        sortColumn: editViewSortColumn,
        sortDirection: editViewSortDirection,
      }
    }));
    setActiveViewFilter(viewName); // Navigate to the new view
  };

  const handleDeleteCustomView = (viewName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button click
    setCustomViews(customViews.filter(view => view !== viewName));
    setTabOrder(tabOrder.filter(tab => tab !== viewName)); // Remove from tab order
    // If the deleted view was currently selected, switch to default Monitoring View
    if (monitoringView === viewName) {
      setMonitoringView("Monitoring View");
    }
  };

  // Callback to move tabs
  const moveTab = useCallback((dragIndex: number, hoverIndex: number) => {
    const newTabOrder = [...tabOrder];
    const draggedTab = newTabOrder[dragIndex];
    newTabOrder.splice(dragIndex, 1);
    newTabOrder.splice(hoverIndex, 0, draggedTab);
    setTabOrder(newTabOrder);
  }, [tabOrder]);

  // Tab overflow detection
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [maxVisibleTabs, setMaxVisibleTabs] = useState<number>(tabOrder.length);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const overflowBtnRef = useRef<HTMLButtonElement>(null);

  // Measure tab widths and determine how many fit
  useEffect(() => {
    const container = tabContainerRef.current;
    if (!container) return;

    const measure = () => {
      const containerWidth = container.parentElement?.clientWidth ?? container.clientWidth;
      // Reserve space for: "Save Current View" button (~160px) + overflow button (~40px) + right section gap
      const reservedWidth = 220;
      const availableWidth = containerWidth - reservedWidth;

      const tabElements = container.querySelectorAll<HTMLElement>('[data-tab-item]');
      let totalWidth = 0;
      let fitCount = 0;

      tabElements.forEach((el) => {
        const tabWidth = el.offsetWidth + 24; // 24px = gap-6
        if (totalWidth + tabWidth <= availableWidth) {
          totalWidth += tabWidth;
          fitCount++;
        }
      });

      // If all tabs fit, show all
      if (fitCount >= tabOrder.length) {
        setMaxVisibleTabs(tabOrder.length);
      } else {
        // At least show 1 tab
        setMaxVisibleTabs(Math.max(1, fitCount));
      }
    };

    // Use ResizeObserver for responsive updates
    const observer = new ResizeObserver(measure);
    if (container.parentElement) observer.observe(container.parentElement);
    measure();

    return () => observer.disconnect();
  }, [tabOrder, tabOrder.length, customViews]);

  const visibleTabs = tabOrder.slice(0, maxVisibleTabs);
  const overflowTabs = tabOrder.slice(maxVisibleTabs);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!showOverflowMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node) &&
        overflowBtnRef.current && !overflowBtnRef.current.contains(e.target as Node)
      ) {
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOverflowMenu]);

  // Drag reorder inside overflow menu
  const [dragOverflowIdx, setDragOverflowIdx] = useState<number | null>(null);
  const handleOverflowDragStart = (idx: number) => setDragOverflowIdx(idx);
  const handleOverflowDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverflowIdx === null || dragOverflowIdx === idx) return;
    // Reorder within full tabOrder
    const fromGlobal = maxVisibleTabs + dragOverflowIdx;
    const toGlobal = maxVisibleTabs + idx;
    const newOrder = [...tabOrder];
    const [dragged] = newOrder.splice(fromGlobal, 1);
    newOrder.splice(toGlobal, 0, dragged);
    setTabOrder(newOrder);
    setDragOverflowIdx(idx);
  };
  const handleOverflowDragEnd = () => setDragOverflowIdx(null);

  // Get tab label, icon, and description based on ID
  const getTabInfo = (tabId: string) => {
    switch (tabId) {
      case "running":
        return { label: "All Campaigns", icon: "running" as const, description: "View all campaigns that generated performance data within the last 7 days." };
      case "draft":
        return { label: "Drafts", icon: "draft" as const, description: "Review and launch campaigns that are not yet active." };
      case "attention":
        return { label: "Needs Attention", icon: "attention" as const, description: "View campaigns that require action due to performance issues." };
      case "watchlist":
        return { label: "Watchlist", icon: "watchlist" as const, description: "Track your starred campaigns in one place." };
      default:
        return { label: tabId, icon: null, description: undefined };
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <img src={orangeAccessLogo} alt="OrangeAccess Media" className="h-5 object-contain opacity-80" />
                </div>
                <Button variant="default" className="bg-orange-500 hover:bg-orange-600">
                  Create a Campaign
                </Button>
              </div>

              <nav className="flex items-center gap-1">
                <Button variant="ghost" className="text-gray-600">Overview</Button>
                <Button variant="ghost" className="text-gray-900 border-b-2 border-gray-900 rounded-none">
                  Campaigns
                </Button>
                <Button variant="ghost" className="text-gray-600">Reporting</Button>
              </nav>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-gray-400">Raw Names</span>
                  <Switch checked={showDemoNames} onCheckedChange={setShowDemoNames} />
                </label>
                <div className="relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-xs text-white flex items-center justify-center">
                    4
                  </span>
                </div>
                <img src={dewaltLogo} alt="DEWALT" className="h-8 w-8 rounded object-cover" />
                <div className="text-sm text-gray-600">Dewalt - Home Depot</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-4 flex-1 flex flex-col min-h-0">
          {/* Title */}
          <div className="mb-2 px-6">
            <h1 className="text-2xl font-semibold text-gray-900">Your Campaigns</h1>
          </div>

          {/* Summary Cards - hidden for now */}
          {/* <div className="pt-2">
            <CampaignSummaryCards />
          </div> */}

          {/* Views Filter Bar */}
          <div className="mb-2 border-b border-border px-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6 min-w-0 flex-1">
                {/* Measurement container - render all tabs invisibly to measure */}
                <div ref={tabContainerRef} className="contents">
                  {/* Render visible tabs */}
                  {visibleTabs.map((tabId, index) => {
                    const tabInfo = getTabInfo(tabId);
                    const isCustom = customViews.includes(tabId);
                    return (
                      <div key={tabId} data-tab-item>
                        <DraggableTab
                          id={tabId}
                          index={index}
                          label={tabInfo.label}
                          description={tabInfo.description}
                          icon={tabInfo.icon}
                          count={tabCounts[tabId] ?? 0}
                          isActive={activeViewFilter === tabId}
                          isCustomView={isCustom}
                          isDefaultView={defaultViewId === tabId}
                          onClick={() => setActiveViewFilter(tabId)}
                          onEdit={tabId === "watchlist" ? undefined : () => {
                            setEditingViewName(tabId);
                            setNewViewName(tabInfo.label);
                            setIsEditingView(true);
                            const config = viewConfigurations[tabId];
                            if (config) {
                              setViewFilterRows(config.filters.map(f => ({ ...f })));
                              setViewSelectedColumns([...config.columns]);
                            } else {
                              setViewFilterRows(appliedFilters.map(f => ({ ...f })));
                              setViewSelectedColumns([...visibleColumns]);
                            }
                            const viewConfig = viewConfigurations[tabId];
                            setEditViewSortColumn(viewConfig?.sortColumn || "lastModified");
                            setEditViewSortDirection(viewConfig?.sortDirection || "desc");
                            setShowCreateViewDrawer(true);
                          }}
                          onDelete={isCustom ? () => {
                            setEditingViewName(tabId);
                            setShowDeleteConfirmation(true);
                          } : undefined}
                          onMakeDefault={() => setDefaultViewId(tabId)}
                          moveTab={moveTab}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Overflow "More" button */}
                {overflowTabs.length > 0 && (
                  <div className="relative shrink-0">
                    <button
                      ref={overflowBtnRef}
                      className={`flex items-center gap-1 pb-2 border-b-2 transition-colors cursor-pointer ${
                        overflowTabs.includes(activeViewFilter)
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontFamily: 'var(--font-family-inter)', fontSize: 'var(--text-sm)' }}
                      onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                        {overflowTabs.length} more
                      </span>
                      {overflowTabs.includes(activeViewFilter) && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none" style={{ fontSize: '10px', fontWeight: 600 }}>
                          {tabCounts[activeViewFilter] ?? 0}
                        </span>
                      )}
                    </button>

                    {/* Overflow dropdown menu */}
                    {showOverflowMenu && (
                      <div
                        ref={overflowMenuRef}
                        className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border shadow-elevation-sm py-1 min-w-[260px] max-h-[360px] overflow-y-auto"
                        style={{ borderRadius: 'var(--radius-card)', fontFamily: 'var(--font-family-inter)' }}
                      >
                        {overflowTabs.map((tabId, idx) => {
                          const tabInfo = getTabInfo(tabId);
                          const isCustom = customViews.includes(tabId);
                          const isActive = activeViewFilter === tabId;
                          return (
                            <div
                              key={tabId}
                              draggable
                              onDragStart={() => handleOverflowDragStart(idx)}
                              onDragOver={(e) => handleOverflowDragOver(e, idx)}
                              onDragEnd={handleOverflowDragEnd}
                              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group/overflow ${
                                isActive
                                  ? "bg-primary/5 text-primary"
                                  : "text-popover-foreground hover:bg-muted/50"
                              } ${dragOverflowIdx === idx ? "opacity-50" : ""}`}
                              style={{ fontSize: 'var(--text-sm)' }}
                              onClick={() => {
                                setActiveViewFilter(tabId);
                                setShowOverflowMenu(false);
                              }}
                            >
                              <GripVertical className="w-3 h-3 opacity-30 group-hover/overflow:opacity-60 transition-opacity shrink-0 cursor-grab" />
                              <span className="flex-1 truncate" style={{ fontWeight: isActive ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)' }}>
                                {tabInfo.label}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none shrink-0" style={{ fontSize: '10px', fontWeight: 600 }}>
                                {tabCounts[tabId] ?? 0}
                              </span>
                              {/* Always-visible edit & delete for overflow items */}
                              {tabId !== "watchlist" && (
                                <button
                                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowOverflowMenu(false);
                                    setEditingViewName(tabId);
                                    setNewViewName(tabInfo.label);
                                    setIsEditingView(true);
                                    const config = viewConfigurations[tabId];
                                    if (config) {
                                      setViewFilterRows(config.filters.map(f => ({ ...f })));
                                      setViewSelectedColumns([...config.columns]);
                                    } else {
                                      setViewFilterRows(appliedFilters.map(f => ({ ...f })));
                                      setViewSelectedColumns([...visibleColumns]);
                                    }
                                    const viewConfig = viewConfigurations[tabId];
                                    setEditViewSortColumn(viewConfig?.sortColumn || "lastModified");
                                    setEditViewSortDirection(viewConfig?.sortDirection || "desc");
                                    setShowCreateViewDrawer(true);
                                  }}
                                  title="Edit view"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              {isCustom && (
                                <button
                                  className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowOverflowMenu(false);
                                    setEditingViewName(tabId);
                                    setShowDeleteConfirmation(true);
                                  }}
                                  title="Delete view"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Save Current View - always visible, disabled until config changes */}
                <button
                  className={`flex items-center gap-1 pb-2 border-b-2 border-transparent shrink-0 transition-colors ${
                    hasUnsavedChanges
                      ? "text-muted-foreground hover:text-foreground cursor-pointer"
                      : "text-muted/60 cursor-not-allowed"
                  }`}
                  style={{ fontFamily: 'var(--font-family-inter)', fontSize: 'var(--text-sm)' }}
                  onClick={() => setShowSaveViewDialog(true)}
                  disabled={!hasUnsavedChanges}
                >
                  <Plus className="w-3 h-3" />
                  <span style={{ fontWeight: 'var(--font-weight-medium)' }}>Save Current View</span>
                </button>
              </div>

              {/* Right-aligned buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <ExportSelector />
              </div>
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="-mt-2 pt-2 pb-2 flex items-center gap-3 px-6">
            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 rounded-lg bg-white border-gray-300 hover:border-gray-400"
              />
            </div>

            <div className="flex-1"></div>

            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />

            {/* Quick Filter Dropdown */}
            <Popover open={showQuickFilter} onOpenChange={setShowQuickFilter}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 h-9 rounded-lg border-gray-300 hover:border-gray-400"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Quick Filters
                  {quickFilterActiveCount > 0 && (
                    <span className="ml-1 bg-[#f26318] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                      {quickFilterActiveCount}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="end">
                <div className="max-h-[480px] overflow-y-auto py-1">

                  {/* ── Status ── */}
                  <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                    {quickFilterActiveCount > 0 && (
                      <button onClick={clearAllQuickFilters} className="text-[11px] text-[#f26318] hover:underline">Clear all</button>
                    )}
                  </div>
                  {quickFilterStatusOptions.map(opt => (
                    <button key={opt} type="button" onClick={() => toggleQuickValue(quickFilterStatus, setQuickFilterStatus, opt)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left">
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${quickFilterStatus.includes(opt) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"}`}>
                        {quickFilterStatus.includes(opt) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{opt}</span>
                    </button>
                  ))}
                  {/* Awaiting Verification parent */}
                  <button type="button" onClick={() => toggleQuickGroup(quickFilterStatus, setQuickFilterStatus, quickFilterAwaitingOptions)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left">
                    <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                      quickFilterAwaitingOptions.every(c => quickFilterStatus.includes(c))
                        ? "bg-[#f26318] border-[#f26318]"
                        : quickFilterAwaitingOptions.some(c => quickFilterStatus.includes(c))
                          ? "bg-[#f26318]/40 border-[#f26318]"
                          : "border-gray-300"
                    }`}>
                      {quickFilterAwaitingOptions.every(c => quickFilterStatus.includes(c)) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      {!quickFilterAwaitingOptions.every(c => quickFilterStatus.includes(c)) && quickFilterAwaitingOptions.some(c => quickFilterStatus.includes(c)) && <div className="w-2 h-0.5 bg-white rounded" />}
                    </div>
                    <span className="text-sm text-gray-700">Awaiting Verification</span>
                  </button>
                  {quickFilterAwaitingOptions.map(opt => (
                    <button key={opt} type="button" onClick={() => toggleQuickValue(quickFilterStatus, setQuickFilterStatus, opt)} className="w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 hover:bg-gray-50 text-left">
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${quickFilterStatus.includes(opt) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"}`}>
                        {quickFilterStatus.includes(opt) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-600">{opt}</span>
                    </button>
                  ))}

                  <div className="my-1.5 border-t border-gray-200" />

                  {/* ── Targeting ── */}
                  <div className="px-3 pt-1 pb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Targeting</span>
                  </div>
                  {quickFilterTargetingOptions.map(opt => (
                    <button key={opt} type="button" onClick={() => toggleQuickValue(quickFilterTargeting, setQuickFilterTargeting, opt)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left">
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${quickFilterTargeting.includes(opt) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"}`}>
                        {quickFilterTargeting.includes(opt) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{opt}</span>
                    </button>
                  ))}

                  <div className="my-1.5 border-t border-gray-200" />

                  {/* ── Objective ── */}
                  <div className="px-3 pt-1 pb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Objective</span>
                  </div>
                  {quickFilterObjectiveOptions.map(opt => (
                    <button key={opt} type="button" onClick={() => toggleQuickValue(quickFilterObjective, setQuickFilterObjective, opt)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left">
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${quickFilterObjective.includes(opt) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"}`}>
                        {quickFilterObjective.includes(opt) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{opt}</span>
                    </button>
                  ))}

                  <div className="my-1.5 border-t border-gray-200" />

                  {/* ── Ad Types ── */}
                  <div className="px-3 pt-1 pb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ad Types</span>
                  </div>
                  {/* Onsite parent */}
                  <button type="button" onClick={() => toggleQuickGroup(quickFilterAdTypes, setQuickFilterAdTypes, quickFilterAdTypesOnsite)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left">
                    <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                      quickFilterAdTypesOnsite.every(c => quickFilterAdTypes.includes(c))
                        ? "bg-[#f26318] border-[#f26318]"
                        : quickFilterAdTypesOnsite.some(c => quickFilterAdTypes.includes(c))
                          ? "bg-[#f26318]/40 border-[#f26318]"
                          : "border-gray-300"
                    }`}>
                      {quickFilterAdTypesOnsite.every(c => quickFilterAdTypes.includes(c)) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      {!quickFilterAdTypesOnsite.every(c => quickFilterAdTypes.includes(c)) && quickFilterAdTypesOnsite.some(c => quickFilterAdTypes.includes(c)) && <div className="w-2 h-0.5 bg-white rounded" />}
                    </div>
                    <span className="text-sm text-gray-700">Onsite</span>
                  </button>
                  {quickFilterAdTypesOnsite.map(opt => (
                    <button key={opt} type="button" onClick={() => toggleQuickValue(quickFilterAdTypes, setQuickFilterAdTypes, opt)} className="w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 hover:bg-gray-50 text-left">
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${quickFilterAdTypes.includes(opt) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"}`}>
                        {quickFilterAdTypes.includes(opt) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-600">{opt}</span>
                    </button>
                  ))}
                  <div className="my-1 mx-3 border-t border-gray-100" />
                  {/* Offsite parent */}
                  <button type="button" onClick={() => toggleQuickGroup(quickFilterAdTypes, setQuickFilterAdTypes, quickFilterAdTypesOffsite)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left">
                    <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                      quickFilterAdTypesOffsite.every(c => quickFilterAdTypes.includes(c))
                        ? "bg-[#f26318] border-[#f26318]"
                        : quickFilterAdTypesOffsite.some(c => quickFilterAdTypes.includes(c))
                          ? "bg-[#f26318]/40 border-[#f26318]"
                          : "border-gray-300"
                    }`}>
                      {quickFilterAdTypesOffsite.every(c => quickFilterAdTypes.includes(c)) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      {!quickFilterAdTypesOffsite.every(c => quickFilterAdTypes.includes(c)) && quickFilterAdTypesOffsite.some(c => quickFilterAdTypes.includes(c)) && <div className="w-2 h-0.5 bg-white rounded" />}
                    </div>
                    <span className="text-sm text-gray-700">Offsite</span>
                  </button>
                  {quickFilterAdTypesOffsite.map(opt => (
                    <button key={opt} type="button" onClick={() => toggleQuickValue(quickFilterAdTypes, setQuickFilterAdTypes, opt)} className="w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 hover:bg-gray-50 text-left">
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${quickFilterAdTypes.includes(opt) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"}`}>
                        {quickFilterAdTypes.includes(opt) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-600">{opt}</span>
                    </button>
                  ))}

                  <div className="my-1.5 border-t border-gray-200" />

                  {/* ── Media Plan ── */}
                  <div className="px-3 pt-1 pb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Media Plan</span>
                  </div>
                  {quickFilterMediaPlanOptions.map(opt => (
                    <button key={opt} type="button" onClick={() => toggleQuickValue(quickFilterMediaPlan, setQuickFilterMediaPlan, opt)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left">
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${quickFilterMediaPlan.includes(opt) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"}`}>
                        {quickFilterMediaPlan.includes(opt) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{opt}</span>
                    </button>
                  ))}
                  <div className="pb-1" />
                </div>
              </PopoverContent>
            </Popover>

            {/* Advanced Filters Dropdown */}
            <DropdownMenu open={showFiltersDropdown} onOpenChange={(open) => {
              if (open) {
                // Initialize temp filters with current applied filters or default
                setTempFilters(appliedFilters.length > 0 ? [...appliedFilters] : [
                  { id: `filter-new-${Date.now()}`, field: "", operator: "", values: [] },
                ]);
              }
              setShowFiltersDropdown(open);
            }}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="gap-2 h-9 rounded-lg border-gray-300 hover:border-gray-400"
                >
                  <Filter className="w-4 h-4" />
                  Advanced Filters
                  {advancedFilterActiveCount > 0 && (
                    <span className="ml-1 bg-[#f26318] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                      {advancedFilterActiveCount}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-[540px] p-0" 
                align="end"
              >
                <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
                  {tempFilters.map((filter, index) => {
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
                              className="w-[160px] justify-between"
                            >
                              <span className={`truncate ${!filter.field ? "text-gray-400" : "text-gray-900"}`}>
                                {fieldLabel}
                              </span>
                              <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[220px] max-h-[300px] overflow-y-auto" align="start">
                            {/* Campaign Setup Section */}
                            <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Campaign Setup
                            </DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "name")}>
                              Name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "id")}>
                              ID
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "mediaChannel")}>
                              Media Channel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "startDate")}>
                              Start Date
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "endDate")}>
                              End Date
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "lastModified")}>
                              Last Modified
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "flightCompleted")}>
                              % Flight Completed
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {/* Budget & Pacing Section */}
                            <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Budget & Pacing
                            </DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "pacing")}>
                              Pacing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "budget")}>
                              Budget
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "spend")}>
                              Spend
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "budgetSpent")}>
                              % Budget Spent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "remainingBudget")}>
                              Remaining Budget
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {/* Performance Section */}
                            <DropdownMenuLabel className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Performance
                            </DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "ctr")}>
                              CTR
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "cpc")}>
                              CPC
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "conversionRate")}>
                              Conversion Rate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "sales")}>
                              Sales
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTempFilterField(filter.id, "roas")}>
                              ROAS
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
                                  onClick={() => updateTempFilterOperator(filter.id, op)}
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

                        {/* Value Input/Dropdown */}
                        {inputType === "date" ? (
                          <div className="relative w-[180px]">
                            <input
                              type="date"
                              value={filter.values[0] || ""}
                              onChange={(e) => updateTempFilterValues(filter.id, e.target.value ? [e.target.value] : [])}
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
                        ) : inputType === "dropdown" ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-[180px] justify-between"
                                disabled={!filter.field}
                              >
                                <span className={filter.values.length === 0 ? "text-gray-400" : "text-gray-900"}>
                                  {filter.values.length === 0 
                                    ? "-" 
                                    : filter.values.length === 1 
                                    ? filter.values[0] 
                                    : `${filter.values.length} selected`}
                                </span>
                                <ChevronDown className="w-4 h-4 ml-2" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0" align="start">
                              <div className="py-1 max-h-[300px] overflow-y-auto">
                                {availableValues.map((val) => (
                                  <button
                                    key={val}
                                    onClick={() => {
                                      if (filter.values.includes(val)) {
                                        updateTempFilterValues(filter.id, filter.values.filter(v => v !== val));
                                      } else {
                                        updateTempFilterValues(filter.id, [...filter.values, val]);
                                      }
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                                      filter.values.includes(val) ? "bg-orange-50" : ""
                                    }`}
                                  >
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                                      filter.values.includes(val) ? "bg-[#f26318] border-[#f26318]" : "border-gray-300"
                                    }`}>
                                      {filter.values.includes(val) && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="relative w-[180px]">
                            <Input
                              type={inputType}
                              placeholder="-"
                              value={filter.values[0] || ""}
                              onChange={(e) => updateTempFilterValues(filter.id, [e.target.value])}
                              className="w-full pr-8"
                              disabled={!filter.field}
                            />
                            {tempFilters.length > 1 && (
                              <button
                                onClick={() => removeTempFilterRow(filter.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Filter Button */}
                  <Button
                    variant="outline"
                    onClick={addTempFilterRow}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add filter
                  </Button>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <Button variant="outline" onClick={handleCancelFilters}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleApplyFilters}
                      className="bg-[#f26318] hover:bg-[#d94f0e] text-white"
                    >
                      Apply filters
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Customization Button */}
            <Button
              variant="outline"
              onClick={() => setShowColumnDrawer(true)}
              className="gap-2 h-9 rounded-lg border-gray-300 hover:border-gray-400"
            >
              <Settings className="w-4 h-4" />
              Columns
            </Button>


          </div>

          {/* Campaigns Table with integrated filters */}
          <CampaignsTable 
            campaigns={filteredCampaigns}
            showDemoNames={showDemoNames}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
            statusOptions={statusOptions}
            toggleStatus={toggleStatus}
            onUpdateCampaign={(id, updates) => {
              setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            }}
            onSaveCustomView={handleSaveCustomView}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            appliedFiltersFromApp={appliedFilters}
            setAppliedFiltersInApp={setAppliedFilters}
            onStarredChange={(ids) => setStarredCampaignIds(new Set(ids))}
            quickFilters={{
              targeting: quickFilterTargeting,
              objective: quickFilterObjective,
              adTypes: quickFilterAdTypes,
              mediaPlan: quickFilterMediaPlan,
            }}
            onRemoveQuickFilter={(category, value) => {
              if (category === "targeting") setQuickFilterTargeting(prev => prev.filter(v => v !== value));
              else if (category === "objective") setQuickFilterObjective(prev => prev.filter(v => v !== value));
              else if (category === "adTypes") setQuickFilterAdTypes(prev => prev.filter(v => v !== value));
              else if (category === "mediaPlan") setQuickFilterMediaPlan(prev => prev.filter(v => v !== value));
            }}
            onClearAllFilters={() => {
              setQuickFilterStatus([]);
              setQuickFilterTargeting([]);
              setQuickFilterObjective([]);
              setQuickFilterAdTypes([]);
              setQuickFilterMediaPlan([]);
              setAppliedFilters([]);
            }}
          />
        </main>

        {/* Create/Edit View Drawer */}
        <ViewEditorDrawer
          open={showCreateViewDrawer}
          isEditing={isEditingView}
          isSystemView={!customViews.includes(editingViewName) && isEditingView}
          viewName={newViewName}
          onViewNameChange={setNewViewName}
          filters={viewFilterRows}
          onFiltersChange={setViewFilterRows}
          columns={viewSelectedColumns}
          onColumnsChange={setViewSelectedColumns}
          sortColumn={editViewSortColumn}
          onSortColumnChange={setEditViewSortColumn}
          sortDirection={editViewSortDirection}
          onSortDirectionChange={setEditViewSortDirection}
          allColumns={allColumns}
          filterFieldLabels={filterFieldLabels}
          fieldOperators={fieldOperators}
          fieldInputTypes={fieldInputTypes}
          filterOptions={filterOptions}
          onCancel={() => {
            setShowCreateViewDrawer(false);
            setIsEditingView(false);
            setEditingViewName("");
            setNewViewName("");
          }}
          onSave={() => {
            if (!newViewName.trim()) return;

            const savedFilters = viewFilterRows;
            const savedColumns = viewSelectedColumns;

            const newConfig = {
              filters: savedFilters,
              columns: savedColumns,
              sortColumn: editViewSortColumn,
              sortDirection: editViewSortDirection,
            };

            if (isEditingView && editingViewName) {
              // Editing existing view
              const newViewConfigurations = { ...viewConfigurations };
              
              // If renaming a custom view, remove old entry
              if (editingViewName !== newViewName) {
                delete newViewConfigurations[editingViewName];
                
                // Update customViews array
                const newCustomViews = customViews.filter(v => v !== editingViewName);
                newCustomViews.push(newViewName);
                setCustomViews(newCustomViews);
                
                // Update tabOrder
                const newTabOrder = tabOrder.map(id => id === editingViewName ? newViewName : id);
                setTabOrder(newTabOrder);
                
                // Update active view if it was the edited one
                if (activeViewFilter === editingViewName) {
                  setActiveViewFilter(newViewName);
                }
              }

              // Apply changes if editing the active view
              if (activeViewFilter === editingViewName || activeViewFilter === newViewName) {
                setSortColumn(editViewSortColumn);
                setSortDirection(editViewSortDirection);
                setAppliedFilters(savedFilters);
                setVisibleColumns(savedColumns.length > 0 ? savedColumns : defaultVisibleColumns);
                setInitialFilters(savedFilters);
                setInitialVisibleColumns(savedColumns.length > 0 ? savedColumns : defaultVisibleColumns);
              }
            } else {
              // Create new view
              handleSaveCustomView(newViewName);
            }
            // Reset unsaved changes tracking
            setHasUnsavedChanges(false);

            // Save the new/updated configuration
            setViewConfigurations(prev => ({
              ...prev,
              [newViewName]: newConfig
            }));

            // Close drawer
            setShowCreateViewDrawer(false);
            setIsEditingView(false);
            setEditingViewName("");
            setNewViewName("");
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete View</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{editingViewName}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setEditingViewName("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  // Remove from view configurations
                  const newViewConfigurations = { ...viewConfigurations };
                  delete newViewConfigurations[editingViewName];
                  setViewConfigurations(newViewConfigurations);

                  // Remove from customViews
                  setCustomViews(customViews.filter(v => v !== editingViewName));

                  // Remove from tabOrder
                  setTabOrder(tabOrder.filter(id => id !== editingViewName));

                  // If the deleted view was active, switch to "running"
                  if (activeViewFilter === editingViewName) {
                    setActiveViewFilter("running");
                  }

                  setShowDeleteConfirmation(false);
                  setEditingViewName("");
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Current View Dialog */}
        <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Current View</DialogTitle>
              <DialogDescription>
                Enter a name for this view. Your current filters will be saved.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="View name"
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveViewName.trim()) {
                    handleSaveCurrentView();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSaveViewDialog(false);
                  setSaveViewName("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#f26318] hover:bg-[#d94f0e] text-white"
                onClick={handleSaveCurrentView}
                disabled={!saveViewName.trim()}
              >
                Save View
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Column Customization Drawer */}
        <FieldsDrawer
          open={showColumnDrawer}
          onOpenChange={setShowColumnDrawer}
          allColumns={allColumns}
          visibleColumns={visibleColumns}
          onSaveColumns={(columns) => {
            setVisibleColumns(columns);
            setShowColumnDrawer(false);
          }}
        />

        {/* Filter Drawer */}
        <FilterCustomizer
          open={showFilterDrawer}
          onOpenChange={setShowFilterDrawer}
          currentFilters={appliedFilters}
          onApplyFilters={(filters) => {
            setAppliedFilters(filters);
          }}
        />

        {/* Critical Campaigns Drawer */}
        <CriticalCampaignsDrawer
          open={showCriticalDrawer}
          onOpenChange={setShowCriticalDrawer}
          campaigns={campaigns}
          calculateCampaignHealth={calculateCampaignHealth}
          mode="critical"
          onNavigateToTab={() => setActiveViewFilter("attention")}
        />

        {/* All Issues Drawer */}
        <CriticalCampaignsDrawer
          open={showAllIssuesDrawer}
          onOpenChange={setShowAllIssuesDrawer}
          campaigns={campaigns}
          calculateCampaignHealth={calculateCampaignHealth}
          mode="all"
          onNavigateToTab={() => setActiveViewFilter("attention")}
        />
      </div>
      <Toaster />
    </DndProvider>
  );
}

export default App;