import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Campaign } from "@/app/components/CampaignsTable";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Copy, Check, ExternalLink } from "lucide-react";

interface PacingPopoverProps {
  campaign: Campaign;
  health: {
    status: string;
    color: string;
    label: string;
    issues: string[];
    trendContext?: string;
    trendDirection?: string;
  };
  children: React.ReactNode;
}

// Deterministic pseudo-random seeded by campaign ID
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function formatCurrency(value: number, compact?: boolean): string {
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function PacingPopover({ campaign, health, children }: PacingPopoverProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "projection">("projection");
  const [tableCopied, setTableCopied] = useState(false);
  const isCopyingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (closeTimeout.current) { clearTimeout(closeTimeout.current); closeTimeout.current = null; }
    hoverTimeout.current = setTimeout(() => setIsOpen(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) { clearTimeout(hoverTimeout.current); hoverTimeout.current = null; }
    closeTimeout.current = setTimeout(() => {
      if (!isCopyingRef.current && !tableCopied) setIsOpen(false);
    }, 200);
  }, [tableCopied]);

  const handleContentMouseEnter = useCallback(() => {
    if (closeTimeout.current) { clearTimeout(closeTimeout.current); closeTimeout.current = null; }
  }, []);

  const handleContentMouseLeave = useCallback(() => {
    closeTimeout.current = setTimeout(() => {
      if (!isCopyingRef.current && !tableCopied) setIsOpen(false);
    }, 200);
  }, [tableCopied]);

  const seed = useMemo(() => {
    return parseInt(campaign.id.replace(/\D/g, "")) || 113602;
  }, [campaign.id]);

  // Compute pacing delta (same algorithm as CampaignsTable)
  const pacingDelta = useMemo(() => {
    // If campaign has custom pacing context, compute delta from that data
    if (campaign.pacingContext) {
      const trend = campaign.pacingContext.dailyTrend;
      if (trend.length >= 6) {
        const priorAvg = (trend[0].actual + trend[1].actual + trend[2].actual) / 3;
        const recentAvg = (trend[trend.length - 3].actual + trend[trend.length - 2].actual + trend[trend.length - 1].actual) / 3;
        const target = trend[trend.length - 1].expected;
        return target > 0 ? Math.round(((recentAvg - priorAvg) / target) * 100) : 0;
      }
      return 0;
    }
    const current = parseFloat(campaign.pacing.replace(/[^0-9.-]/g, ""));
    const idNum = seed;
    const getRandom = (index: number) => {
      const x = Math.sin(idNum + index * 123.45) * 10000;
      return x - Math.floor(x);
    };
    const days = 7;
    const values = new Array(days).fill(0);
    values[days - 1] = current;
    for (let i = days - 2; i >= 0; i--) {
      const volatility = 0.2;
      const direction = getRandom(i) > 0.5 ? 1 : -1;
      const percentChange = getRandom(i + 100) * volatility;
      const absoluteChange = (values[i + 1] * percentChange) * direction;
      const noise = (getRandom(i + 200) * 10) - 5;
      let prevValue = values[i + 1] + absoluteChange + noise;
      prevValue = Math.max(0, Math.min(200, prevValue));
      values[i] = prevValue;
    }
    const priorAvg = (values[0] + values[1] + values[2]) / 3;
    const currentAvg = (values[4] + values[5] + values[6]) / 3;
    return Math.round(currentAvg - priorAvg);
  }, [campaign.pacing, seed, campaign.pacingContext]);

  // Core flight calculations
  const flightInfo = useMemo(() => {
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    const today = new Date();

    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));
    const remainingDays = totalDays - elapsedDays;
    const dailyTarget = campaign.budget / totalDays;

    return { start, end, today, totalDays, elapsedDays, remainingDays, dailyTarget };
  }, [campaign]);

  // Tab 1: Last 7 days daily spend vs expected
  const dailyTrendData = useMemo(() => {
    // Use custom pacing context data if available
    if (campaign.pacingContext) {
      return campaign.pacingContext.dailyTrend;
    }
    const { dailyTarget, elapsedDays } = flightInfo;
    const days = Math.min(7, elapsedDays);
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = dayLabels[date.getDay() === 0 ? 6 : date.getDay() - 1];
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      // Generate deterministic daily spend with realistic variance
      const pacingRate = parseFloat(campaign.pacing.replace(/[^0-9.-]/g, "")) / 100;
      const variance = 0.7 + seededRandom(seed, i + 50) * 0.6; // 0.7–1.3x
      const dailySpend = dailyTarget * pacingRate * variance;

      data.push({
        day: `${dayName}, ${dateStr}`,
        shortDay: dateStr,
        actual: Math.round(dailySpend),
        expected: Math.round(dailyTarget),
      });
    }

    return data;
  }, [campaign, seed, flightInfo]);

  const dailySummary = useMemo(() => {
    if (campaign.pacingContext) {
      return campaign.pacingContext.projectionNote;
    }
    if (dailyTrendData.length === 0) return "No spend data available yet.";
    const avgSpend = dailyTrendData.reduce((sum, d) => sum + d.actual, 0) / dailyTrendData.length;
    const target = dailyTrendData[0]?.expected || 0;
    const diff = avgSpend - target;
    const pct = target > 0 ? Math.abs(diff / target) * 100 : 0;

    if (Math.abs(pct) < 5) {
      return `Daily spend averaged ${formatCurrency(avgSpend)}, closely tracking the ${formatCurrency(target)} daily target.`;
    }
    return `Daily spend averaged ${formatCurrency(avgSpend)}, ${diff > 0 ? "above" : "below"} the ${formatCurrency(target)} daily target by ${pct.toFixed(0)}%.`;
  }, [dailyTrendData, campaign.pacingContext]);

  // Tab 2: Cumulative spend + projection
  const projectionData = useMemo(() => {
    const { start, totalDays, elapsedDays, dailyTarget } = flightInfo;
    const data = [];

    // If campaign has custom pacing context, build projection from that
    if (campaign.pacingContext) {
      const trend = campaign.pacingContext.dailyTrend;
      const projEnd = campaign.pacingContext.projectedEndSpend;
      
      // Build cumulative from daily trend
      let cumActual = campaign.spend - trend.reduce((s, d) => s + d.actual, 0);
      cumActual = Math.max(0, cumActual); // spend before the 7-day window
      
      // Sample historical points leading up to the trend window
      const daysBeforeTrend = elapsedDays - trend.length;
      const oldDailyTarget = trend[0].expected; // pre-change target for early days
      const earlyStep = Math.max(1, Math.floor(daysBeforeTrend / 6));
      for (let i = 0; i <= daysBeforeTrend; i += earlyStep) {
        const dayIndex = Math.min(i, daysBeforeTrend);
        const date = new Date(start);
        date.setDate(start.getDate() + dayIndex);
        const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        // Before budget change, actual was tracking close to old expected
        const earlyActualCum = (cumActual / Math.max(1, daysBeforeTrend)) * dayIndex;
        const earlyExpectedCum = oldDailyTarget * dayIndex;
        data.push({
          label,
          dayIndex,
          actual: Math.round(earlyActualCum),
          target: Math.round(earlyExpectedCum),
          projected: null as number | null,
        });
      }
      
      // Add the 7-day trend window as cumulative points
      let runningActual = cumActual;
      for (let t = 0; t < trend.length; t++) {
        runningActual += trend[t].actual;
        const dayIndex = daysBeforeTrend + t + 1;
        const date = new Date(start);
        date.setDate(start.getDate() + dayIndex);
        const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        // After budget change, expected line jumps to new daily target
        const expectedCum = dailyTarget * dayIndex;
        data.push({
          label,
          dayIndex,
          actual: Math.round(runningActual),
          target: Math.round(expectedCum),
          projected: null,
        });
      }
      
      // Set projected on last historical point to connect lines
      if (data.length > 0) {
        data[data.length - 1].projected = data[data.length - 1].actual;
      }
      
      // Add projection to end of flight — cap at budget
      const remainingDays = totalDays - elapsedDays;
      if (remainingDays > 0) {
        const endDate = new Date(start);
        endDate.setDate(start.getDate() + totalDays);
        data.push({
          label: endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          dayIndex: totalDays,
          actual: null,
          target: campaign.budget,
          projected: Math.min(projEnd, campaign.budget),
        });
      }
      
      return data;
    }

    const pacingRate = parseFloat(campaign.pacing.replace(/[^0-9.-]/g, "")) / 100;

    let cumulativeActual = 0;

    // Historical points (sample ~12 points max for readability)
    const step = Math.max(1, Math.floor(elapsedDays / 12));
    for (let i = 0; i <= elapsedDays; i += step) {
      const dayIndex = Math.min(i, elapsedDays);
      const date = new Date(start);
      date.setDate(start.getDate() + dayIndex);
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const expectedCum = dailyTarget * dayIndex;

      // Build cumulative actual with variance
      let actualCum = 0;
      for (let d = 0; d < dayIndex; d++) {
        const variance = 0.75 + seededRandom(seed, d + 200) * 0.5;
        actualCum += dailyTarget * pacingRate * variance;
      }

      data.push({
        label,
        dayIndex,
        actual: Math.round(actualCum),
        target: Math.round(expectedCum),
        projected: null as number | null,
      });
      cumulativeActual = actualCum;
    }

    // Make sure we have the "today" point
    const lastHistorical = data[data.length - 1];
    if (lastHistorical && lastHistorical.dayIndex < elapsedDays) {
      const todayDate = new Date(start);
      todayDate.setDate(start.getDate() + elapsedDays);
      let actualCum = 0;
      for (let d = 0; d < elapsedDays; d++) {
        const variance = 0.75 + seededRandom(seed, d + 200) * 0.5;
        actualCum += dailyTarget * pacingRate * variance;
      }
      data.push({
        label: todayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayIndex: elapsedDays,
        actual: Math.round(actualCum),
        target: Math.round(dailyTarget * elapsedDays),
        projected: null,
      });
      cumulativeActual = actualCum;
    }

    // Set projected on the last historical point to connect the lines
    if (data.length > 0) {
      data[data.length - 1].projected = data[data.length - 1].actual;
    }

    // Projection points to end of flight
    const projectionSteps = Math.min(6, totalDays - elapsedDays);
    if (projectionSteps > 0) {
      const dailyRunRate = elapsedDays > 0 ? cumulativeActual / elapsedDays : dailyTarget * pacingRate;
      const projStep = Math.max(1, Math.floor((totalDays - elapsedDays) / projectionSteps));

      for (let i = 1; i <= projectionSteps; i++) {
        const dayIndex = Math.min(elapsedDays + projStep * i, totalDays);
        const date = new Date(start);
        date.setDate(start.getDate() + dayIndex);
        const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const futureDays = dayIndex - elapsedDays;
        const projectedVal = Math.min(Math.round(cumulativeActual + dailyRunRate * futureDays), campaign.budget);

        data.push({
          label,
          dayIndex,
          actual: null as number | null,
          target: Math.round(dailyTarget * dayIndex),
          projected: projectedVal,
        });
      }

      // Ensure the final point is exactly at totalDays
      const lastPoint = data[data.length - 1];
      if (lastPoint.dayIndex < totalDays) {
        const endDate = new Date(start);
        endDate.setDate(start.getDate() + totalDays);
        const futureDays = totalDays - elapsedDays;
        const projectedVal = Math.min(Math.round(cumulativeActual + dailyRunRate * futureDays), campaign.budget);
        data.push({
          label: endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          dayIndex: totalDays,
          actual: null,
          target: campaign.budget,
          projected: projectedVal,
        });
      }
    }

    return data;
  }, [campaign, seed, flightInfo]);

  // Projected end spend — capped at budget since spend cannot exceed the allocated budget
  const projectedEndSpend = useMemo(() => {
    const lastProjected = [...projectionData].reverse().find((d) => d.projected !== null);
    const raw = lastProjected?.projected ?? campaign.spend;
    return Math.min(raw, campaign.budget);
  }, [projectionData, campaign.spend, campaign.budget]);

  const spendDelta = projectedEndSpend - campaign.budget;
  const deltaPercent = campaign.budget > 0 ? (spendDelta / campaign.budget) * 100 : 0;
  const isOnTrack = Math.abs(deltaPercent) < 3;
  const isUnder = spendDelta < 0 && !isOnTrack;

  const projectionSummary = useMemo(() => {
    if (campaign.pacingContext) {
      return campaign.pacingContext.projectionNote;
    }
    if (isOnTrack) {
      return `Projected to finish within budget, ending at ${formatCurrency(projectedEndSpend)} of the ${formatCurrency(campaign.budget)} target.`;
    }
    if (isUnder) {
      return `On track to underspend by ${formatCurrency(Math.abs(spendDelta))} (${Math.abs(deltaPercent).toFixed(1)}%) by end of flight.`;
    }
    return `Projected to spend the full ${formatCurrency(campaign.budget)} budget by end of flight.`;
  }, [projectedEndSpend, campaign.budget, spendDelta, deltaPercent, isUnder, isOnTrack]);

  // Build tab-separated table text for copy
  const tableText = useMemo(() => {
    const header = `${campaign.name} — 7-Day Pacing Data`;
    const separator = "Day\tExpected Spend\tActual Spend\tDifference";
    const rows = dailyTrendData.map((d) => {
      const diff = d.actual - d.expected;
      const sign = diff >= 0 ? "+" : "";
      return `${d.day}\t${formatCurrency(d.expected)}\t${formatCurrency(d.actual)}\t${sign}${formatCurrency(diff)}`;
    });
    const totalExpected = dailyTrendData.reduce((s, d) => s + d.expected, 0);
    const totalActual = dailyTrendData.reduce((s, d) => s + d.actual, 0);
    const totalDiff = totalActual - totalExpected;
    const totalSign = totalDiff >= 0 ? "+" : "";
    rows.push(`Total\t${formatCurrency(totalExpected)}\t${formatCurrency(totalActual)}\t${totalSign}${formatCurrency(totalDiff)}`);
    return `${header}\n${separator}\n${rows.join("\n")}`;
  }, [dailyTrendData, campaign.name]);

  const handleCopyTable = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isCopyingRef.current = true;
    try {
      const textArea = document.createElement("textarea");
      textArea.value = tableText;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setTableCopied(true);
      setTimeout(() => {
        setTableCopied(false);
        isCopyingRef.current = false;
      }, 2000);
    } catch {
      isCopyingRef.current = false;
    }
  }, [tableText]);

  const CustomDailyTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const fullDay = payload[0]?.payload?.day;
    const actual = payload.find((p: any) => p.dataKey === "actual")?.value;
    const expected = payload.find((p: any) => p.dataKey === "expected")?.value;
    const pace = expected > 0 ? Math.round(((actual - expected) / expected) * 100) : 0;
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
        <div className="text-gray-500 mb-1">{fullDay}</div>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-700">{entry.name}:</span>
            <span className="text-gray-900">{formatCurrency(entry.value)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-2 h-2" />
          <span className="text-gray-700">Pace:</span>
          <span className="text-gray-900">{pace >= 0 ? "+" : ""}{pace}%</span>
        </div>
      </div>
    );
  };

  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
        <div className="text-gray-500 mb-1">{label}</div>
        {payload.map((entry: any, i: number) =>
          entry.value != null ? (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-700">{entry.name}:</span>
              <span className="text-gray-900">{formatCurrency(entry.value)}</span>
            </div>
          ) : null
        )}
      </div>
    );
  };

  // Animation variants for tab transitions
  const tabVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className={`p-0 overflow-hidden shadow-elevation-sm border border-border rounded-[var(--radius-card)] w-[580px]`}
        side="right"
        align="start"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
        onFocusOutside={(e) => {
          if (tableCopied || isCopyingRef.current) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (tableCopied || isCopyingRef.current) e.preventDefault();
        }}
      >
        {/* Tabs */}
        <div className="px-4 pt-3 pb-3 border-b border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("projection")}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                activeTab === "projection"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Spend Projection
            </button>
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                activeTab === "daily"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Daily Trend
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeTab === "daily" && (
              <motion.div
                key="daily"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <div className="flex">
                  {/* Left: Chart */}
                  <div className="flex-1 min-w-0">
                    <div className="h-[180px] -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyTrendData}>
                          <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis key="xaxis" dataKey="shortDay" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                          <YAxis key="yaxis" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={38} />
                          <Tooltip key="tooltip" content={<CustomDailyTooltip />} />
                          <Line key="line-actual" name="Actual" type="monotone" dataKey="actual" stroke="#f26318" strokeWidth={2} dot={{ r: 3, fill: "#f26318", strokeWidth: 0 }} activeDot={{ r: 4, fill: "#f26318", strokeWidth: 2, stroke: "#fff" }} />
                          <Line key="line-expected" name="Expected" type="monotone" dataKey="expected" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-0 border-t-2 border-[#f26318]" />
                        <span className="text-[10px] text-gray-500">Actual</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-0 border-t-2 border-dashed border-gray-300" />
                        <span className="text-[10px] text-gray-500">Expected</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px bg-gray-200 mx-4 self-stretch" />

                  {/* Right: Table */}
                  <div className="w-[200px] shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">7-Day Breakdown</span>
                      <button
                        onClick={handleCopyTable}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                          tableCopied
                            ? "bg-gray-200 text-gray-700 border border-gray-300"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
                        }`}
                      >
                        {tableCopied ? <><Check className="w-2.5 h-2.5" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy</>}
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden flex-1">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-1.5 py-1 text-gray-500">Day</th>
                            <th className="text-right px-1.5 py-1 text-gray-500">Spend</th>
                            <th className="text-right px-1.5 py-1 text-gray-500">Pace</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyTrendData.map((row, i) => {
                            const pace = row.expected > 0 ? Math.round(((row.actual - row.expected) / row.expected) * 100) : 0;
                            return (
                              <tr key={i} className={`border-b border-gray-100 last:border-b-0 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                                <td className="px-1.5 py-0.5 text-gray-700">{row.shortDay}</td>
                                <td className="text-right px-1.5 py-0.5 text-gray-900">{formatCurrency(row.actual, true)}</td>
                                <td className="text-right px-1.5 py-0.5 text-gray-600">
                                  {pace >= 0 ? "+" : ""}{pace}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t border-gray-200">
                            <td className="px-1.5 py-1 text-gray-900">Avg</td>
                            <td className="text-right px-1.5 py-1 text-gray-900">{formatCurrency(dailyTrendData.length > 0 ? dailyTrendData.reduce((s, d) => s + d.actual, 0) / dailyTrendData.length : 0, true)}</td>
                            {(() => {
                              const totalActual = dailyTrendData.reduce((s, d) => s + d.actual, 0);
                              const totalExpected = dailyTrendData.reduce((s, d) => s + d.expected, 0);
                              const avgPace = totalExpected > 0 ? Math.round(((totalActual - totalExpected) / totalExpected) * 100) : 0;
                              return (
                                <td className="text-right px-1.5 py-1 text-gray-600">
                                  {avgPace >= 0 ? "+" : ""}{avgPace}%
                                </td>
                              );
                            })()}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "projection" && (
              <motion.div
                key="projection"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <div className="flex">
                  {/* Left: Chart */}
                  <div className="flex-1 min-w-0">
                    <div className="h-[160px] -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={projectionData}>
                          <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis key="xaxis" dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
                          <YAxis key="yaxis" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={38} />
                          <Tooltip key="tooltip" content={<CustomLineTooltip />} />
                          <Line key="line-target" name="Target" type="monotone" dataKey="target" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
                          <Line key="line-actual" name="Actual" type="monotone" dataKey="actual" stroke="#f26318" strokeWidth={2} dot={false} connectNulls />
                          <Line key="line-projected" name="Projected" type="monotone" dataKey="projected" stroke="#f26318" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-0 border-t-2 border-[#f26318]" />
                        <span className="text-[10px] text-gray-500">Actual</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-0 border-t-2 border-dashed border-[#f26318]" />
                        <span className="text-[10px] text-gray-500">Projected</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-0 border-t-2 border-dashed border-gray-300" />
                        <span className="text-[10px] text-gray-500">Target</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px bg-gray-200 mx-4 self-stretch" />

                  {/* Right: Stats */}
                  <div className="w-[155px] shrink-0 flex flex-col justify-center gap-4">
                    {/* Total Budget */}
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Total Budget</div>
                      <div className="text-lg text-gray-900">{formatCurrency(campaign.budget, true)}</div>
                    </div>

                    {/* Current Pacing */}
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Current Pacing</div>
                      <div className="text-lg text-gray-900">{campaign.pacing}</div>
                      {pacingDelta !== 0 && (
                        <div className="text-[11px] flex items-center gap-0.5 text-gray-500">
                          {pacingDelta > 0 ? "+" : ""}{pacingDelta}% vs prior 7d
                        </div>
                      )}
                      {pacingDelta === 0 && (
                        <div className="text-[11px] text-gray-400">Stable vs prior 7d</div>
                      )}
                    </div>

                    {/* Budget Remaining */}
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Est. Budget Remaining</div>
                      <div className="text-lg text-gray-900">
                        {formatCurrency(Math.abs(spendDelta), true)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {isOnTrack ? "On track" : `${Math.abs(deltaPercent).toFixed(1)}% unspent`}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer link */}
        <div className="px-4 py-2.5 border-t border-gray-100">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            See campaign history
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}